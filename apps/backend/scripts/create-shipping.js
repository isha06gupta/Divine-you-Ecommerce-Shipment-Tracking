const {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} = require("@medusajs/framework/utils")
const {
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
} = require("@medusajs/medusa/core-flows")

const DEFAULT_REGION_ID = "reg_01KQV7Z47P4V9R76MPFWH6PPP7"
const DEFAULT_PAYMENT_PROVIDER_ID = "pp_system_default"
const DEFAULT_FULFILLMENT_PROVIDER_ID = "manual_manual"
const DEFAULT_SHIPPING_OPTION_NAME = "Standard Manual Shipping"

async function queryFirst(query, entity, fields, filters = {}) {
  const { data } = await query.graph({
    entity,
    fields,
    filters,
  })

  return data[0]
}

async function ensureSystemPaymentProvider(container, region, logger) {
  logger.info(`Ensuring ${DEFAULT_PAYMENT_PROVIDER_ID} is enabled for region ${region.id}`)

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: {
        payment_providers: [DEFAULT_PAYMENT_PROVIDER_ID],
      },
    },
  })
}

async function ensureStockLocation(container, query, logger) {
  const existingStockLocation = await queryFirst(query, "stock_location", ["id", "name"])

  if (existingStockLocation?.id) {
    logger.info(`Using existing stock location: ${existingStockLocation.name} (${existingStockLocation.id})`)
    return existingStockLocation
  }

  logger.info("Creating default stock location for manual shipping")

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "Default Warehouse",
          address: {
            address_1: "123 Warehouse Street",
            city: "Demo City",
            country_code: "US",
          },
        },
      ],
    },
  })

  return stockLocation
}

async function linkStockLocationToSalesChannel(container, query, stockLocation, logger) {
  const salesChannel = await queryFirst(query, "sales_channel", ["id", "name"])

  if (!salesChannel?.id) {
    logger.warn("No sales channel found. Skipping stock-location sales-channel link.")
    return
  }

  try {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [salesChannel.id],
      },
    })
    logger.info(`Linked stock location ${stockLocation.id} to sales channel ${salesChannel.id}`)
  } catch (error) {
    logger.warn(`Stock location may already be linked to sales channel: ${error.message}`)
  }
}

async function ensureFulfillmentSet(container, query, link, fulfillmentModuleService, region, stockLocation, logger) {
  const existingFulfillmentSet = await queryFirst(query, "fulfillment_set", [
    "id",
    "name",
    "*service_zones",
  ])

  if (existingFulfillmentSet?.service_zones?.length) {
    logger.info(`Using existing fulfillment set: ${existingFulfillmentSet.name} (${existingFulfillmentSet.id})`)
    return existingFulfillmentSet
  }

  const countryCode = getRegionCountryCode(region)

  if (!countryCode) {
    throw new Error(`Region ${region.id} does not have any countries. Add at least one country to the region first.`)
  }

  logger.info(`Creating manual fulfillment set for country ${countryCode}`)

  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: DEFAULT_FULFILLMENT_PROVIDER_ID,
      },
    })
  } catch (error) {
    logger.warn(`Manual fulfillment provider may already be linked to stock location: ${error.message}`)
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Manual delivery fulfillment set",
    type: "shipping",
    service_zones: [
      {
        name: `${region.name || "Default"} delivery zone`,
        geo_zones: [
          {
            country_code: countryCode,
            type: "country",
          },
        ],
      },
    ],
  })

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  })

  return fulfillmentSet
}

function getRegionCountryCode(region) {
  const country = Array.isArray(region.countries) ? region.countries[0] : null
  return (country?.iso_2 || country?.country_code || "").toLowerCase()
}

async function ensureShippingOption(container, query, region, fulfillmentSet, logger) {
  const existingShippingOption = await queryFirst(query, "shipping_option", ["id", "name"], {
    name: DEFAULT_SHIPPING_OPTION_NAME,
  })

  if (existingShippingOption?.id) {
    logger.info(`Shipping option already exists: ${existingShippingOption.name} (${existingShippingOption.id})`)
    return existingShippingOption
  }

  const shippingProfile = await queryFirst(query, "shipping_profile", ["id", "name"])

  if (!shippingProfile?.id) {
    throw new Error("No shipping profile found. Create a shipping profile before creating shipping options.")
  }

  const serviceZone = fulfillmentSet.service_zones?.[0]

  if (!serviceZone?.id) {
    throw new Error("The fulfillment set does not have a service zone.")
  }

  logger.info(`Creating ${DEFAULT_SHIPPING_OPTION_NAME} for region ${region.id}`)

  const {
    result: [shippingOption],
  } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: DEFAULT_SHIPPING_OPTION_NAME,
        price_type: "flat",
        provider_id: DEFAULT_FULFILLMENT_PROVIDER_ID,
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard Manual Shipping",
          description: "Default manual shipping option for local development checkout.",
          code: "standard_manual",
        },
        prices: [
          {
            region_id: region.id,
            amount: 10,
          },
          {
            currency_code: region.currency_code,
            amount: 10,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            operator: "eq",
            value: "true",
          },
          {
            attribute: "is_return",
            operator: "eq",
            value: "false",
          },
        ],
      },
    ],
  })

  logger.info(`Created shipping option ${shippingOption.id}`)
  return shippingOption
}

module.exports = async function createShipping({ container, args }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(ModuleRegistrationName.FULFILLMENT)
  const regionId = args?.[0] || process.env.REGION_ID || DEFAULT_REGION_ID

  logger.info(`Preparing checkout setup for region ${regionId}`)

  const region = await queryFirst(query, "region", [
    "id",
    "name",
    "currency_code",
    "*countries",
  ], {
    id: regionId,
  })

  if (!region?.id) {
    throw new Error(`Region ${regionId} was not found. Pass a valid region id as the first script argument.`)
  }

  await ensureSystemPaymentProvider(container, region, logger)
  const stockLocation = await ensureStockLocation(container, query, logger)
  await linkStockLocationToSalesChannel(container, query, stockLocation, logger)
  const fulfillmentSet = await ensureFulfillmentSet(container, query, link, fulfillmentModuleService, region, stockLocation, logger)
  const shippingOption = await ensureShippingOption(container, query, region, fulfillmentSet, logger)

  logger.info("Checkout setup completed successfully.")
  logger.info(`Region: ${region.name} (${region.id})`)
  logger.info(`Payment provider: ${DEFAULT_PAYMENT_PROVIDER_ID}`)
  logger.info(`Shipping option: ${shippingOption.name} (${shippingOption.id})`)
}
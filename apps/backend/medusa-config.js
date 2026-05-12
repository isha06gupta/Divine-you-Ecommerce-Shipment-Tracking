const { defineConfig } = require("@medusajs/framework/utils")

module.exports = defineConfig({
  
  projectConfig: {

    databaseUrl: "postgres://postgres:%40Ishagm1@localhost:5432/medusa_db",

    http: {

  storeCors: "http://localhost:5500,http://127.0.0.1:5500",

  adminCors: "http://localhost:7001",

  authCors: "http://localhost:5500,http://127.0.0.1:5500",

      jwtSecret: "supersecret",

      cookieSecret: "supersecret"
    }
  }
})
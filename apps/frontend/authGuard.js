function checkAccess(allowedRole){

    const user =
    JSON.parse(
        localStorage.getItem("divineYouUser")
    );

    if(!user){

        window.location.href =
        "./index.html";

        return false;
    }

    if(
        user.role.toLowerCase() !==
        allowedRole.toLowerCase()
    ){

        alert("Access Denied");

        window.location.href =
        "./index.html";

        return false;
    }

    return true;
}
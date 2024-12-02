
let user = {}

function initernalFunction(){

}

function getUser() {
    initernalFunction();
    return user.name;
}

function LogIn(name) {
    initernalFunction();
    user.name = name
}

initernalFunction()

module.exports = {
    getUser,
    LogIn
}
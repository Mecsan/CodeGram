const { LogIn, getUser } = require("./extra/users");
const c = (a,b)=>{
    return Some(a,b);
};
function Some(a,b){
    function Some(){
        function Some(){

        }
    }
    return c;
};
function getDetails(){
    return getUser();
}
function main(){
    Some(1,1);
    LogIn();
    getDetails();

    function getDetails(){
        // Instead of just name we should also incorporate the scope in which the function is defined
        console.log("This is inner")
    }
}


// not working for now
var d = function (){
    Some(10,20)
    console.log("Heavy fatse")
}

main();
d();
Some(20,30);
getDetails();

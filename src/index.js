const parser = require('@babel/parser');
let fs = require('fs/promises');
const path = require('path');

async function forFile(filePath,relative) {

    let obj = {
        actualPath: filePath,
        relativePath :relative,
        externalDependecies: [],
    }
    let funntionCalledGraph = new Map();

    obj.dependecies = funntionCalledGraph;
    // node to [node]
    // type node{
    //    name : "",
    //    scope : ""
    //    isExternal : ""
    //}
    let cache = {};

    let parentMap = new Map();
    let callScope = {};
    // key is function name & value is scope information 
    try {
        let data = await fs.readFile(filePath, { encoding: 'utf-8' });
        var tree = parser.parse(data);
        await dfs(tree.program, null, relative);
    } catch (err) {
        console.log("Error while reading " + filePath, err)
    }

    async function dfs(node, parent, scope) {
        if (node.type == 'Program') {
            for (let child of node.body) {
                parentMap.set(child, node);
                await dfs(child, node, scope);
            }
        }
        if (node.type == 'FunctionDeclaration') {
            // check that if functionCall has this same name function & updated its scope if 
            // this scope is more deeper to also support valid hoisting 

            let preCope = callScope[node.id.name] || relative;
            // console.log(node.id.name,preCope,scope)
            callScope[node.id.name] = scope;
            parentMap.set(node.body, node);
            await dfs(node.body, node, scope + node.id.name + "/");
            callScope[node.id.name] = preCope
        }

        if (node.type == 'ArrowFunctionExpression') {
            let preCope = callScope[parentMap.get(node).id.name] || relative;
            // console.log(preCope)
            callScope[parentMap.get(node).id.name] = scope;
            parentMap.set(node.body, node);
            await dfs(node.body, parent, scope + "/" + parentMap.get(node).id.name);
            callScope[parentMap.get(node).id.name] = preCope
        }

        if (node.type == 'BlockStatement') {
            for (let child of node.body) {
                parentMap.set(child, node);
                await dfs(child, parent, scope);
            }
        }

        if (node.type == 'VariableDeclaration') {
            for (let child of node.declarations) {
                parentMap.set(child, node);
                await dfs(child, parent, scope);
            }
        }

        if (node.type == 'VariableDeclarator') {
            parentMap.set(node.init, node);

            if (node.init.type == 'ArrowFunctionExpression') {
               await dfs(node.init, node, scope);
            }
            else {
                await dfs(node.init, parent, scope);
            }
        }

        if (node.type == 'ExpressionStatement') {
            parentMap.set(node.expression, node);
            await dfs(node.expression, parent, scope)
        }
        if (node.type == 'ReturnStatement') {
            parentMap.set(node.argument, node);
            await dfs(node.argument, parent, scope);
        }

        if (node.type == 'CallExpression') {
            let callee = {};

            if (node.callee.type == 'Identifier') {
                callee.name = node.callee.name;
                callee.scope = callScope[callee.name];
            } else if (node.callee.type == "MemberExpression") {
                callee.name = node.callee.object.name + "." + node.callee.property.name;
                callee.scope = callScope[node.callee.property.name];
            }

            if (callee.name == 'require') {
                // make a another call for dfs
                let depFile = node.arguments[0].value + ".js";
                const absoluteFirstPath = path.resolve(filePath);
                const firstDir = path.dirname(absoluteFirstPath);
                const absoluteSecondPath = path.resolve(firstDir, depFile);
                // let relativePath = path.relative(firstDir, absoluteSecondPath);
                // relativePath = relativePath.replaceAll("\\", "/");
                //  filePath.split("/").slice(0,-1).join("/") + "/" + depFile
                parentMap.get(node).id.properties.forEach((property) => {
                    callScope[property.key.name] = depFile
                })

                let depFilePath = "./" + path.relative(__dirname, absoluteSecondPath).replaceAll("\\", "/");
                let external = await forFile(depFilePath, depFile);
                obj.externalDependecies.push(external);
                return;
            }

            let caller = {};
            if (parent.type == 'Program') {
                caller.name = relative
                caller.scope = relative
            } else if (parent.type == 'FunctionDeclaration' || parent.type == 'VariableDeclarator') {
                caller.name = parent.id.name;
                caller.scope = callScope[caller.name]
            }

            if (JSON.stringify(caller) in cache) {
                caller = cache[JSON.stringify(caller)];
            } else {
                cache[JSON.stringify(caller)] = caller;
            }

            if (funntionCalledGraph.has(caller)) {
                let ex = funntionCalledGraph.get(caller) || [];
                ex.push(callee);
                funntionCalledGraph.set(caller, ex)
            } else {
                funntionCalledGraph.set(caller, [callee])
            }
        }
    }

    return obj;
}

forFile("./data/index.js", "index.js").then((data) => {
    console.dir(data, { depth: null })
}).catch((e) => {
    console.log(e)
})



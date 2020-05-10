# render
Render Function && Virtual Dom
## hyperscript
```
[selector] or
[selector, data] or
[selector, children] or
[selector, child, child, child, ...]
[selector, data, children] or
[selector, data, child, child, child, ...]

1. <div></div>
//-------------------------------
["div"]

2. <div id="app"></div>
//-------------------------------
["div#app"] or 
["div", {id: "app"}]

3. <div id="app" class="d-flex flex-row"></div>
//-------------------------------
["div#app.d-flex.flex-row"] or
["div#app", {class: "d-flex flex-row"}] or
["div", {id: "app", class: "d-flex flex-row"}]

4. <div id="app" class="d-flex flex-row" style="display:none;">content</div>
//-------------------------------
["div#app.d-flex.flex-row[style=display:none;]", "content"] or
["div#app.d-flex.flex-row", {style: "display:none;"}, "content"] or
["div", {id: "app", class: "d-flex flex-row", style: "display:none;"}, "content"]

5. <div id="app"><h6>title</h6><p>text</p>...</div>
//-------------------------------
["div#app", ["h6", "title"], ["p", "text"], ...] or 
["div#app", [
    ["h6", "title"],
    ["p", "text"],
    ...
]]
```
## render(selector, object)
```
render("#app", {
    options: {
        text: "world"    
    },
    renders: {
        main: function(o, w){
            return ["span", {
                onclick: w._click
            }, "hello " + o.text];
        },
    },
    _click: function(){
        this._update({text: "render"});
    }
});
```
## ["render[name=*]", data]
```
// data: object
//-------------------------------
render("#app", {
    options: {
        user: {
            name: "user",
            email: "user@email.com"            
        }  
    },
    renders: {
        main: function(o, w){
            return ["this", {
                onclick: w._clickApp
            },
                [render[name=user], o.user],
                ["div", "something else here"]
            ];
        },
        user: function(user, o, w){
            return ["div.user", {
                onclick: w._clickUser    
            }, [
               ["div.name", user.name],
               ["div.email", user.email]
            ]];
        }
    },
    _clickApp: function(){
        // diff and patch whole app, renders.main();
        this._update(function(prevOptions){
            prevOptions.user = {
                name: "render",
                email: "render@email.com"  
            }
        });
    },
    _clickUser: function(e, raw){
        // diff and patch only renders.user();
        raw.update(function(prevUser){
            prevUser.name = "render";
            prevUser.email = "render@email.com";
        });
    }
});

// data: array
//-------------------------------
render("#app", {
    options: {
        items: [
            {text: "action"},
            {text: "another action"},
            {text: "something else here"}
        ]  
    },
    renders: {
        main: function(o, w){
            return ["ul", [
               [render[name=item], o.items]
            ]];
        },
        item: function(item, i, o, w){
            return ["li", {key: i}, ["span", item.text]];
        }
    }
});
```
## ["widget[name=*]", data, children]
```
render("#app", {
    renders: {
        main: function(o, w){
            return [
                ["render[name=helloworld]"],                
                ["div", "something else here"]
            ];
        },
        helloworld: function(o, w){
            return [widget[name=helloworld], {
                text: "hello ~"
            }, ["p", "this is p"]];
        }
    }
});
```
## ["slot[name=*]", data, children]
```
render("#app", { 
    options: {
        demo: {text: "demo"}
    },  
    renders: {
        main: function(o, w){
            return [
                ["render[name=helloworld]"],                
                ["div", "something else here"]
            ];
        },
        helloworld: function(o, w){
            return [widget[name=helloworld], {
                text: "hello ~"
            }, [
                // use slot[name=default]
                ["p", "this is p"],
                // use solt[name=demo]
                ["slot[name=demo]", o.demo, [
                    ["div", "demo"]
                ]] 
            ]];
        }
    }
});
```
## render.widget(name, object)
```
render.widget("helloworld", {
    options: {        
        text: "hello world"    
    },
    renders: {
        main: function(o, w){
            return [
                ["span", {
                    onclick: w._click
                }, o.text],
                // define slot[name=default]
                ["slot[name=default]", function(s, o, w){
                    // s.data = {}, s.text = "", s.children = ["p", "this is p"]
                    return s.text || s.children;
                }],
                // define slot[name=demo]
                ["slot[name=demo]", function(s, o, w){
                    // s.data = {text: "demo"}, s.text = "", s.children = ["div", "demo"]
                    return s.text || s.children;
                }]
            ];
        },
    }
});
```
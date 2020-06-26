# jianaj-render.js
基于虚拟DOM技术的浏览器端渲染库。
## 安装
```shell script
// npm:
npm install jianaj-render
// yarn:
yarn add jianaj-render
````
## 引入和render()
```javascript
import render from 'jianaj-render';

/* 
render(selector, options)
-----------------------------
渲染一个DOM元素。

@param: selector, 一个DOM元素或css3选择器。
@param: options, 包含renders['main']主方法的object配置项。
*/

render('#app', {

    // 渲染数据:

    options: {
        text: 'Hello World!'
    },
    
    // 渲染方法:

    renders: {
        main (o, w){

            // o: this.options渲染数据
            // w: this整个对象

            return ["this", {onclick: w._clickApp}, ['span', o.text]];
        }
    },

    // 其它方法:

    _clickApp(){
        this._update(o => {
            o.text = 'Hello App!'
        });
    }
});
```

## 采用纯js数据表达html

```javascript
// html: 
let elem = '<div></div>';
// render:
let elem = ["div"];

// html: 
let elem = '<div id="app"></div>';
// render:
let elem = ["div#app"];
let elem = ["div", {id: "app"}];

// html: 
let elem = '<div id="app" class="d-flex flex-row"></div>';
// render:
let elem = ["div#app.d-flex.flex-row"];
let elem = ["div#app.d-flex", {class: "flex-row"}];
let elem = ["div#app", {class: "d-flex flex-row"}];
let elem = ["div", {id: "app", class: "d-flex flex-row"}];

// html:
let elem = '<div id="app" class="d-flex flex-row" style="display:none;">content</div>';
// render:
let elem = ["div#app.d-flex.flex-row[style=display:none;]", "content"];
let elem = ["div#app.d-flex.flex-row", {style: "display:none;"}, "content"];
let elem = ["div", {id: "app", class: "d-flex flex-row", style: "display:none;"}, "content"];

// html:
let elem = '<div id="app"><h6>title</h6><p>text</p></div>';
// render:
let elem = ["div#app", ["h6", "title"], ["p", "text"]];
let elem = ["div#app", [
               ["h6", "title"],
               ["p", "text"]
           ]];
```
## 在渲染方法中使用 ["render[name=*]", data]
```javascript
import render from 'jianaj-render';

/* 
["render[name=*]", data]
------------------------
在一个渲染方法中调用另一个渲染方法。

@attr: name, 被调用的渲染方法名称
@data: data, 传递给被调用渲染方法的参数。如果data是数组，则遍历数组调用渲染方法。
*/

render("#app", {

    options: {
        user: {
            name: "user",
            email: "user@email.com"            
        }  
    },

    renders: {
        main(o, w){
            return ["this", {
                onclick: w._clickApp
            },
                // main方法中调用user方法    
                ["render[name=user]", o.user],

                ["div", "something else here"]
            ];
        },
        user(user, o, w){
            return ["div.user", {
                onclick: w._clickUser    
            }, [
               ["div.name", user.name],
               ["div.email", user.email]
            ]];
        }
    },

    _clickApp (){         
        // 全局更新
        this._update(o => {
            o.user = {
                name: "render",
                email: "render@email.com"  
            }
        });
    },
    _clickUser(e, raw){
        // 局部更新 renders.user方法;
        raw.update(user => {
            user.name = "render";
            user.email = "render@email.com";
        });
    }
});

// 另一个例子， 当data是数组的时候：

render("#app", {
    options: {
        items: [
            {text: "action"},
            {text: "another action"},
            {text: "something else here"}
        ]  
    },
    renders: {
        main(o, w){
            return ["ul", [
                // o.items 是数组， item方法被遍历调用三次。
                ["render[name=item]", o.items]
            ]];
        },
        item(item, i, o, w){
            return ["li", {key: i}, ["span", item.text]];
        }
    }
});
```
## 定义组件render.widget()
```javascript
import render from 'jianaj-render';

/* 
render.widget(name, options)
------------------------
定义一个组件。

@param: name, 组件名称
@param: options, 包含renders['main']主方法的object配置项。
*/

render.widget("helloworld", {
    options: {        
        text: "Hello World"    
    },
    renders: {
        main(o, w){
            return ["span", { onclick: w._click}, o.text]
        },
    },
    _click(e, raw) {
        this._update(o => {
            o.text = "Hello World";
        });
    }
});
```
## 在渲染方法中使用["widget[name=*]", data, children]
```javascript
import render from 'jianaj-render';

/* 
["widget[name=*]", data, children]
------------------------
在一个渲染方法中调用组件。

@attr: name, 被调用的组件名称
@options: data, 传递给被调用组件的options。会覆盖组件默认options值。
@slots: children, 传递给被调用组件的slots，组件通过["slot[name=*]"，fn]接收处理。
*/

// 定义一个helloworld组件：

render.widget("helloworld", {
    options: {        
        text: "Hello World"    
    },
    renders: {
        main(o, w){
            return ["this", {onclick: w._click}, [
                ["span", o.text],

                // 接收处理default默认插槽。
                ["slot[name=default]", (s, o, w) => {

                    // s.data = {}, s.text = "", s.children = ["p", "this is p"]

                    return s.text || s.children;
                }],

                // 接收处理demo插槽。
                ["slot[name=demo]", (s, o, w) => {

                    // s.data = {text: "demo"}, s.text = "", s.children = ["div", "demo"]

                    return s.text || s.children;
                }]            
            ]];            
        },
    },
    _click(e, raw) {
        this._update(o => {
            o.text = "Hello World";
        });
    }
});

// 调用helloworld组件:

render("#app", {
    options: {
        demo: {text: "demo"}
    },  
    renders: {
        main(o, w){
            return [  

                // 调用hello渲染方法
                ["render[name=hello]"],  
              
                ["div", "something else here"]
            ];
        },
        hello(o, w){

            // 调用helloworld组件
            return [
                "widget[name=helloworld]", 

                // options    
                {text: "hello ~"}, 

                // slots
                [ 
                    // 做为default默认插槽传给组件
                    ["p", "this is p"],
    
                    // 做为demo插槽传给组件
                    ["slot[name=demo]", o.demo, [
                        ["div", "demo"]
                    ]
                ] 
            ]];
        }
    }
});
```
## 在渲染方法中使用["slot[name=*]"]
```javascript
import render from 'jianaj-render';

/* 
["slot[name=*]", data, children]
--------------------------------
调用组件的时候，向组件传递一个具名插槽。

@attr: name, 插槽名称
@data: data, 传递给插槽的数据。
@elems: children, 传递给插槽的DOM元素。
*/

render("#app", {
    options: {
        demo: {text: "demo"}
    },  
    renders: {
        main(o, w){
            return [  

                // 调用hello渲染方法
                ["render[name=hello]"],  
              
                ["div", "something else here"]
            ];
        },
        hello(o, w){

            // 调用helloworld组件
            return [
                "widget[name=helloworld]", 

                // options    
                {text: "hello ~"}, 

                // slots
                [ 
                    // 做为default默认插槽传给组件
                    ["p", "this is p"],
    
                    // 做为demo插槽传给组件
                    ["slot[name=demo]", o.demo, [
                        ["div", "demo"]
                    ]
                ] 
            ]];
        }
    }
});

/* 
["slot[name=*]", fn]
----------------------
组件对传递进来的slot做接收和处理。

@attr: name, 传递进来的slot名称, 不通过具名slot传递进来的DOM元素归到slot[name=default]。
@handler: fn, 接收slot值，处理和返回处理结果。
*/

render.widget("helloworld", {
    options: {        
        text: "Hello World"    
    },
    renders: {
        main(o, w){
            return ["this", {onclick: w._click}, [
                ["span", o.text],

                // 接收处理default默认插槽。
                ["slot[name=default]", (s, o, w) => {

                    // s.data = {}, s.text = "", s.children = ["p", "this is p"]

                    return s.text || s.children;
                }],

                // 接收处理demo插槽。
                ["slot[name=demo]", (s, o, w) => {

                    // s.data = {text: "demo"}, s.text = "", s.children = ["div", "demo"]

                    return s.text || s.children;
                }]            
            ]];            
        },
    },
    _click(e, raw) {
        this._update(o => {
            o.text = "Hello World";
        });
    }
});
```
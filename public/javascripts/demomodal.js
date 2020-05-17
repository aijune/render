define(["jquery", "w/code", "w/demo", "w/modal"], function ($, code) {

    var codeBase = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=modal]", [
                        ["slot[name=title]", "标题"],
                        ["slot[name=content]", [
                            ["div", "我是内容"]
                        ]],
                        ["slot[name=footer]", [
                            ["button.btn.btn-primary[type=bottom]", {
                                onclick: function(data, e, raw){
                                    e.stopPropagation();
                                }
                            }, "确定"],
                            ["button.btn.btn-primary[type=bottom]", "取消"]
                        ]]
                    ]];
                });
            }
        });
    `;

    var codeClose = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=modal]", {
                        closable: false,
                        backdrop: false,
                        keyboard: false
                    }, [
                        ["slot[name=title]", "标题"],
                        ["slot[name=content]", [
                            ["div", "我是内容"]
                        ]],
                        ["slot[name=footer]", [
                            ["button.btn.btn-primary[type=bottom]", {
                                onclick: function(data, e, raw){
                                    e.stopPropagation();
                                    console.log(data);
                                }
                            }, "确定"],
                            ["button.btn.btn-primary[type=bottom]", "取消"]                    
                        ]]
                    ]];
                });
            }
        });
    `;

    var codeBody = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=modal]", [                       
                        ["slot[name=content]", [
                            ["div", "我是内容"]
                        ]]
                    ]];
                });
            }
        });
    `;

    var codeOther = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=modal]", {
                        fade: false,
                        centered: true,
                        size: "xl"
                    }, [
                        ["slot[name=title]", "标题"],
                        ["slot[name=content]", [
                            ["div", "我是内容"]
                        ]],
                        ["slot[name=footer]", [
                            ["button.btn.btn-primary[type=bottom]", {
                                onclick: function(data, e, raw){
                                    e.stopPropagation();
                                    console.log(data);
                                }
                            }, "确定"],
                            ["button.btn.btn-primary[type=bottom]", "取消"]                    
                        ]]
                    ]];
                });
            }
        });
    `;

    $.widget("demomodal", {

        renders: {
            main: function (o, w) {
                return ["widget[name=demo]", [
                    ["slot[name=title]", o.route.title],
                    ["slot[name=nav]", [
                        ["render[name=nav]"]
                    ]],
                    ["slot[name=content]", [
                        ["render[name=content]"]
                    ]]
                ]];
            },
            nav: function(o, w){
                return ["ul", [
                    ["li", ["a[href=#base]", "基本"]],
                    ["li", ["a[href=#close]", "关闭"]],
                    ["li", ["a[href=#body]", "内容"]],
                    ["li", ["a[href=#other]", "其它"]]
                ]];
            },
            content: function (o, w) {
                return [
                    ["h4#base.anchor", "基本"],
                    ["p", "包含3个slot。slot[name=title]，定义标题。slot[name=content]，定义内容。slot[name=footer]，定义底部按钮。"],
                    ["div", {oncreate: [code, codeBase]}],
                    ["h4#close.anchor", "关闭"],
                    ["p", "属性closable: false，隐藏关闭按钮。属性backdrop: false，点击背景禁用关闭。属性keyboard: false，按esc键禁用关闭。"],
                    ["div", {oncreate: [code, codeClose]}],
                    ["h4#body.anchor", "内容"],
                    ["p", "缺省slot[name=title]，slot[name=footer]只显示内容。"],
                    ["div", {oncreate: [code, codeBody]}],
                    ["h4#other.anchor", "其它"],
                    ["p", "属性fade: false，禁用fade效果。属性centered: true，弹出到视口正中。属性size: 'xl/lg/sm'，尺寸规格。"],
                    ["div", {oncreate: [code, codeOther]}]
                ];
            }
        },

        _create: function () {
            this._render();
        }
    });
});

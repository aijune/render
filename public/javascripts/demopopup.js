define(["jquery", "w/code", "w/demo", "w/popup"], function ($, code) {

    var codeBottom = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=popup]", [
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

    var codeTop = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=popup]", {
                        place: "top"
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

    var codeLeft = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=button]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=popup]", {
                        place: "left"
                    }, [                       
                        ["slot[name=content]", [
                            ["div", "我是内容"]
                        ]]
                    ]];
                });
            }
        });
    `;

    var codeRight = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=popup]", {
                        place: "right"
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

    $.widget("demopopup", {

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
                    ["li", ["a[href=#bottom]", "底部"]],
                    ["li", ["a[href=#top]", "项部"]],
                    ["li", ["a[href=#left]", "左侧"]],
                    ["li", ["a[href=#right]", "右侧"]]
                ]];
            },
            content: function (o, w) {
                return [
                    ["h4#bottom.anchor", "底部"],
                    ["p", "包含3个slot。slot[name=title]，定义标题。slot[name=content]，定义内容。slot[name=footer]，定义底部按钮。"],
                    ["div", {oncreate: [code, codeBottom]}],
                    ["h4#top.anchor", "项部"],
                    ["p", "属性closable: false，隐藏关闭按钮。属性backdrop: false，点击背景禁用关闭。属性keyboard: false，按esc键禁用关闭。"],
                    ["div", {oncreate: [code, codeTop]}],
                    ["h4#left.anchor", "左侧"],
                    ["p", "缺省slot[name=title]，slot[name=footer]只显示内容。"],
                    ["div", {oncreate: [code, codeLeft]}],
                    ["h4#right.anchor", "右侧"],
                    ["p", "属性fade: false，禁用fade效果。属性centered: true，弹出到视口正中。属性size: 'xl/lg/sm'，尺寸规格。"],
                    ["div", {oncreate: [code, codeRight]}]
                ];
            }
        },

        _create: function () {
            this._render();
        }
    });
});

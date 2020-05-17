define(["jquery", "w/code", "w/demo", "w/picker"], function ($, code) {

    var codeBase = `
        $(elem).render(function (o, w) {
            return ["button.btn.btn-primary[type=bottom]", {
                onclick: w._openModal
            }, "确定"];
        }, {
            _openModal: function(){
                $("<div>").render(function(){
                    return ["widget[name=picker]", [
                        ["slot[name=title]", "标题"],                        
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


    $.widget("demopicker", {

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
                    ["li", ["a[href=#base]", "基本"]]
                ]];
            },
            content: function (o, w) {
                return [
                    ["h4#base.anchor", "底部"],
                    ["p", "包含3个slot。slot[name=title]，定义标题。slot[name=content]，定义内容。slot[name=footer]，定义底部按钮。"],
                    ["div", {oncreate: [code, codeBase]}]
                ];
            }
        },

        _create: function () {
            this._render();
        }
    });
});

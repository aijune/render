define(["jquery", "w/code", "w/demo", "w/dropdown"], function ($, code) {

    var codeBase = `
        $(elem).render(function () {
            return ["widget[name=dropdown]", [
                ["slot[name=toggle]", [
                    ["button.btn.btn-secondary.dropdown-toggle", "Dropdown button"]                                     
                ]],
                ["slot[name=menu]", [                    
                    ["a.dropdown-item[href=#]", "Action"],
                    ["a.dropdown-item[href=#]", "Another action"],
                    ["a.dropdown-item[href=#]", "Something else here"]
                ]]
            ]];
        });
    `;

    var codeRight = `
        $(elem).render(function () {
            return ["widget[name=dropdown]", {placement: "bottom-end"}, [
                ["slot[name=toggle]", [
                    ["button.btn.btn-secondary.dropdown-toggle", "Dropdown button"]
                ]],
                ["slot.dropdown-menu-right[name=menu]", [
                    ["a.dropdown-item[href=#]", "Action"],
                    ["a.dropdown-item[href=#]", "Another"],
                    ["a.dropdown-item[href=#]", "Something"]
                ]]
            ]];
        });
    `;

    var codeSplit = `
        $(elem).render(function () {
            return ["widget.btn-group[name=dropdown]", [
                ["slot[name=toggle]", [
                    ["button.btn.btn-danger", "Action"],                  
                    ["button.btn.btn-danger.dropdown-toggle.dropdown-toggle-split"]
                ]],
                ["slot[name=menu]", [
                    ["a.dropdown-item[href=#]", "Action"],
                    ["a.dropdown-item[href=#]", "Another"],
                    ["a.dropdown-item[href=#]", "Something"]
                ]]
            ]];
        });
    `;

    $.widget("demodropdown", {

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
                    ["li", ["a[href=#right]", "右对齐"]],
                    ["li", ["a[href=#split]", "分隔"]]
                ]];
            },
            content: function (o, w) {
                return [
                    ["h4#base.anchor", "基本"],
                    ["p", "包含2个slot。slot[name=toggle]，定义切换按钮，按钮必须有 .dropdown-toggle类。slot[name=menu]，定义弹出menu。"],
                    ["div", {oncreate: [code, codeBase]}],
                    ["h4#right", "右对齐"],
                    ["p", "slot[name=menu]增加 .dropdown-menu-right 类。"],
                    ["div", {oncreate: [code, codeRight]}],
                    ["h4#split", "分隔"],
                    ["p", "widget[name=dropdown]增加 .btn-group类。slot[name=toggle]中的 .dropdown-toggle元素增加 .dropdown-toggle-split类。"],
                    ["div", {oncreate: [code, codeSplit]}],
                ];
            }
        },

        _create: function () {
            this._render();
        }
    });
});

define(["render", "w/menu"], function (render) {

    return render.widget("layout", {

        options: {
            state: "max",
            title: {max: "AdminUI", min: "UI"},
            navs: [
                {
                    toggle: "消息",
                    subs: [
                        {href: "#", text: "Action"},
                        {href: "#", text: "Another action"},
                        {href: "#", text: "Something else here"},
                        null,
                        {href: "#", text: "Separated link"},
                    ]
                },
                {
                    toggle: "语言切换",
                    subs: [
                        {href: "#", text: "Action"},
                        {href: "#", text: "Another action"},
                        {href: "#", text: "Something else here"},
                        null,
                        {href: "#", text: "Separated link"},
                    ]
                },
                {
                    toggle: "用户中心",
                    subs: [
                        {href: "#", text: "Action"},
                        {href: "#", text: "Another action"},
                        {href: "#", text: "Something else here"},
                        null,
                        {href: "#", text: "Separated link"},
                    ]
                }
            ],
            menu: [
                {href: "/", icon: "glyphicon glyphicon-dashboard", title: "仪表盘"},
                {href: "#", icon: "glyphicon glyphicon-th-large", title: "组件", extend: false, subs: [
                        {href: "/forms", title: "Form 表单"},
                        {href: "/dropdowns", title: "Dropdown 下拉"},
                        {href: "/buttons", title: "Button 按钮"},
                        {href: "/icons", title: "Icon 图标"}
                    ]}
            ]
        },

        renders: {
            main: function(o, w){
                return ["this.layout", [
                    ["render[name=header]"],
                    ["render[name=body]"]
                ]];
            },
            header: function (o, w) {
                return ["header.layout-header", [
                    ["render[name=brand]"],
                    ["render[name=topbar]"]
                ]];
            },
            body: function (o, w) {
                return ["main.layout-body", {class: o.state}, [
                    ["render[name=aside]"],
                    ["article.layout-article.router-view"]
                ]];
            },
            brand: function(o, w){
                return ["a.layout-brand[href=#]", [
                    ["span.toggle", {class: o.state}, o.title[o.state]]
                ]];
            },
            topbar: function(o, w){
                var arrow = o.state === "max" ? "left" : "right";
                return ["div.layout-topbar", [
                    ["a.toggle[href=#]", {
                        onclick: w._toggle
                    },["i.icon", {class: "glyphicon glyphicon-menu-" + arrow}]],
                    ["div.nav", ["render[name=topbarNavs]", o.navs]]
                ]];
            },
            topbarNavs: function(item){
                /*return ["widget[name=dropdown]", {placement: "bottom-end"}, [
                    ["slot[name=toggle]", [
                        ["a.dropdown-toggle[href=#]", item.toggle]
                    ]],
                    ["slot[name=menu]", [
                        ["render[name=topbarSubs]", item.subs]
                    ]]
                ]];*/
            },
            topbarSubs: function(item){
                return item ? ["a.dropdown-item", {href: item.href}, item.text] : ["div.dropdown-divider"];
            },
            aside: function (o, w) {
                return ["aside.layout-aside", [
                    ["widget[name=menu]", {items: o.menu}]
                ]];
            }
        },

        _toggle: function (e, raw) {
            this._update(function (o) {
                o.state = o.state === "max" ? "min" : "max";
            });
        }
    });
});
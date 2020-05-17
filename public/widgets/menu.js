define(["render"], function (render) {

    render.widget("menu", {

        defaultTag: "ul",

        options: {
            items: []
        },

        renders: {
            main: function (o, w) {
                return ["this.menu",
                    ["render[name=item]", o.items]
                ];
            },
            item: function(item, i, o, w){
                return ["li.menu-item", {
                    class: {
                        extend: {init: item.extend && "add"}
                    }
                }, [
                    ["a", {
                        href: item.href,
                        onclick: item.subs ? w._toggle : [w._link, item]
                    }, [
                        ["i.icon", {class: item.icon}],
                        ["span", item.title],
                        item.subs && ["i.icon.glyphicon.glyphicon-menu-down"]
                    ]],
                    item.subs && ["ul.menu", ["render[name=sub]", item.subs]]
                ]];
            },
            sub: function(item, i, o, w){
                return  ["li.menu-item", [
                    ["a", {
                        href: item.href,
                        onclick: [w._link, item]
                    }, ["span", item.title]]
                ]];
            }
        },

        _toggle: function (e, raw) {
            e.preventDefault();
            raw.update(function (o) {
                o.extend = !o.extend;
            });
        },

        _link: function(item, e, raw){
            render.router.go(item.href, item.title, item, e);
        },

        _height: function (item, raw) {
            if(!item.extend){
                return 0;
            }
            var h = 0;
            $(raw.node).children().each(function () {
                h += $(this).height();
            });
            return h;
        }
    });
});
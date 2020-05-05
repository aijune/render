define(["jquery", "bootstrap", "extend"], function () {

    $.widget("ui.layout", {

        options: {

        },

        renders: {
            main: function (o, w) {
                return [
                    ["render[name=header]"],
                    ["render[name=body]"]
                ];
            },
            header: function (o, w) {
                return ["nav", {
                    class: "navbar navbar-expand-lg navbar-light bg-light"
                }, [
                    ["render[name=brand]"],
                    ["render[name=collapse]"]
                ]];
            },
            brand: function (o, w) {
                return [
                    ["a.navbar-brand[href=#]", "Brand"],
                    ["button.navbar-toggler[type=button]", {
                        "data-toggle": "collapse",
                        "data-target": "#navbarSupportedContent"
                    }, ["span.navbar-toggler-icon"]]
                ];
            },
            collapse: function (o, w) {
                return ["div#navbarSupportedContent.collapse.navbar-collapse", [
                    ["ul.navbar-nav.mr-auto", [
                        ["li.nav-item.active", [
                            ["a.nav-link[href=#]", "Home"]
                        ]],
                        ["li.nav-item", [
                            ["a.nav-link[href=#]", "Link"]
                        ]],
                        ["li.nav-item.dropdown", [
                            ["a.nav-link.dropdown-toggle[data-toggle=dropdown]", "Dropdown"],
                            ["div.dropdown-menu", [
                                ["a.dropdown-item[href=#]", "Action"],
                                ["a.dropdown-item[href=#]", "Another action"],
                                ["div.dropdown-divider"],
                                ["a.dropdown-item[href=#]", "Something else here"]
                            ]]
                        ]],
                        ["li.nav-item", [
                            ["a.nav-link.disabled[href=#][tabindex=-1]", "Disabled"]
                        ]]
                    ]],
                    ["form.form-inline.my-2.my-lg-0", [
                        ["input.form-control.mr-sm-2[type=search][placeholder=Search]"],
                        ["button.btn.btn-outline-success.my-2.my-sm-0[type=submit]", "Search"]
                    ]]
                ]];
            },
            body: function (o, w) {
                return ["div.d-flex",
                    ["render[name=aside]", {style: "250px"}],
                    ["div.article.flex-grow-1.flex-shrink-1", "我是内容。"]
                ];
            },
            aside: function (o, w) {
                return ["div#accordionAside.accordion", [
                    ["div.card", [
                        ["div.card-header", [
                            ["h2.mb-0", [
                                ["button.btn.btn-link.btn-block.text-left[type=button]", {
                                    "data-toggle": "collapse",
                                    "data-target": "#collapseOne"
                                }, "Collapsible Group Item #1"],
                            ]]
                        ]],
                        ["div#collapseOne.collapse.show[data-parent=#accordionAside]", [
                            ["div.card-body.p-0", [
                                ["ul.list-group", [
                                    ["li.list-group-item", "Cras justo odio"],
                                    ["li.list-group-item", "Dapibus ac facilisis in"],
                                    ["li.list-group-item", "Morbi leo risus"],
                                    ["li.list-group-item", "Porta ac consectetur ac"],
                                    ["li.list-group-item", "Vestibulum at eros"]
                                ]]
                            ]]
                        ]]
                    ]],
                    ["div.card", [
                        ["div.card-header", [
                            ["h2.mb-0", [
                                ["button.btn.btn-link.btn-block.text-left[type=button]", {
                                    "data-toggle": "collapse",
                                    "data-target": "#collapseTwo"
                                }, "Collapsible Group Item #1"],
                            ]]
                        ]],
                        ["div#collapseTwo.collapse[data-parent=#accordionAside]", [
                            ["div.card-body.p-0", [
                                ["ul.list-group", [
                                    ["li.list-group-item", "Cras justo odio"],
                                    ["li.list-group-item", "Dapibus ac facilisis in"],
                                    ["li.list-group-item", "Morbi leo risus"],
                                    ["li.list-group-item", "Porta ac consectetur ac"],
                                    ["li.list-group-item", "Vestibulum at eros"]
                                ]]
                            ]]
                        ]]
                    ]]
                ]];
            }
        },

        _create: function(){
            this._render(this.element, "main");
        }
    });
});

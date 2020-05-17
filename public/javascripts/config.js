define({
    layout: {
        menu: [
            {href: "/", icon: ".fa.fa-dashboard", title: "仪表盘"},
            {href: "#", icon: ".fa.fa-object-group", title: "组件", extend: false, subs: [
                {href: "/dropdown", title: "Dropdown 下拉"},
                {href: "/modal", title: "Modal 模态框"},
                {href: "/popup", title: "Popup 弹出层"},
                {href: "/picker", title: "Picker 选择器"},
                {href: "/forms", title: "Form 表单"},
                {href: "/buttons", title: "Button 按钮"},
                {href: "/icons", title: "Icon 图标"}
            ]}
        ]
    }
});

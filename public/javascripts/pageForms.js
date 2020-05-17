define(["render", "w/page", "validator"], function (render) {

    return render.widget("pageForms", {

        renders: {
            main: function (o, w) {
                return ["widget[name=page]", [
                    ["slot[name=title]", "Forms"],
                    ["slot[name=btngroup]", {
                        onclick: w._clickBtngroup
                    },
                        ["button.btn.btn-primary[type=button]", "Primary"],
                        ["button.btn.btn-secondary[type=button]", "secondary"],
                        ["button.btn.btn-warning[type=button]", "warning"]
                    ],
                    ["slot[name=content]", [
                        ["render[name=grid]"]
                    ]]
                ]];
            },
            grid: function (o, w) {
                return ["div.row",
                    ["div.col",
                        ["render[name=cardbase]"]
                    ],
                    ["div.col",
                        ["div.card",
                            ["div.card-header", "Size"],
                            ["div.card-body"]
                        ]
                    ]
                ];
            },
            cardbase: function (o, w) {
                return ["div.card",
                    ["div.card-header", "Theme"],
                    ["div.card-body",
                        ["form", {
                            oncreate: w._form
                        },
                            ["div.form-group",
                                ["label", "Email address"],
                                ["input.form-control[name=email][type=email][placeholder=Enter email]"],
                                ["small.form-text.text-muted", "We'll never share your email with anyone else."]
                            ],
                            ["div.form-group",
                                ["label", "Password"],
                                ["input.form-control[name=password][type=password][placeholder=Password]"]
                            ],
                            ["div.form-group.form-check",
                                ["input.form-check-input[name=agreement][type=checkbox][value=agreement]"],
                                ["label.form-check-label", "Check me out"]
                            ],
                            ["button.btn.btn-primary[type=submit]", {onclick: w._submit}, "Submit"]
                        ]
                    ]
                ];
            }
        },

        _clickBtngroup: function (data, e, raw) {
            console.log(data, raw);
        },

        _form: function(raw){
            raw.widget.validator = raw.widget._validate(raw.node, {
                descriptor: {
                    email: {
                        type: "email",
                        required: true,
                        message: "Name is required",
                        valid: "Name is ok"
                    },
                    password: {
                        required: true,
                        message: "Password is required",
                        valid: "Name is ok"
                    },
                    agreement: {
                        pattern: /^agreement$/,
                        required: true,
                        message: "Agreement is required",
                        valid: "Name is ok"
                    }
                }
            });
        },

         _submit: function (e, raw) {
             e.preventDefault();
             raw.widget.validator.validate(function (fields) {
                 console.log(fields);
             });
         }
    });
});

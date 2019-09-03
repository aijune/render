define(["jquery", "render"], function ($) {

    //Alert

    $.Render.component("alert", {

        close: function (e, raw) {

            var alert = $(e.currentTarget).closest(".alert");
            var fade = alert.hasClass("fade");

            this.hook(alert, "_beforeupdate_", function (raw) {
                $.extend(true, raw.data, {
                    remove: true,
                    classes: {
                        show: {remove: "remove"},
                        fade: {remove: fade ? ["remove", 150] : "remove"}
                    }
                });
            });

            this.update();
            return false;
        }
    });

    //carousel

    $.Render.component("carousel", {

        prev: function (e, raw) {

            var carousel = $(e.currentTarget).closest(".carousel");
            var d = carousel.data("_carousel_") || {};

            if(d.carousing){
                return;
            }

            if(d.interval){
                clearInterval(d.interval);
            }

            this.c.carousel._prev.call(this, carousel, d);
        },

        next: function (e) {
            var carousel = $(e.currentTarget).closest(".carousel");
            var d = carousel.data("_carousel_") || {};

            if(d.carousing){
                return;
            }

            if(d.interval){
                clearInterval(d.interval);
            }

            this.c.carousel._next.call(this, carousel, d);
        },

        to: function(e){
            var target = $(e.currentTarget);
            var n = target.data("slideTo");
            var carousel = target.closest(".carousel");
            var d = carousel.data("_carousel_") || {};

            if(d.carousing){
                return;
            }

            if(d.interval){
                clearInterval(d.interval);
            }

            this.c.carousel._to.call(this, n, carousel, d);
        },

        _prev: function(carousel, d){
            var slides = carousel.find("[data-slide-to]");
            var items = carousel.find(".carousel-item");
            var prev, next;

            d.index = d.index || items.index(items.filter(".active"));
            next = items.eq(d.index);
            d.index--;
            if(d.index < 0){
                d.index = items.length - 1;
            }
            prev = items.eq(d.index);

            this.c.carousel._setHooks.call(this, carousel, slides, items, next, prev, d, "prev");
        },

        _next: function(carousel, d){
            var slides = carousel.find("[data-slide-to]");
            var items = carousel.find(".carousel-item");
            var prev, next;

            d.index = d.index || items.index(items.filter(".active"));
            prev = items.eq(d.index);
            d.index++;
            if(d.index > items.length - 1){
                d.index = 0;
            }
            next = items.eq(d.index);

            this.c.carousel._setHooks.call(this, carousel, slides, items, prev, next, d, "next");
        },

        _to: function(n, carousel, d){
            var slides = carousel.find("[data-slide-to]");
            var items = carousel.find(".carousel-item");
            var prev, next;

            d.index = d.index || items.index(items.filter(".active"));
            if(n === d.index){
                return;
            }
            prev = items.eq(d.index);
            next = items.eq(n);
            if(!next.length){
                return;
            }

            if(n > d.index){
                d.index = n;
                this.c.carousel._setHooks.call(this, carousel, slides, items, prev, next, d, "next");
            }
            else if(n < d.index){
                d.index = n;
                this.c.carousel._setHooks.call(this, carousel, slides, items, prev, next, d, "prev");
            }
        },

        _setHooks: function(carousel, slides, items, prev, next, d, direct){

            var classLeft = direct === "next" ? "carousel-item-left" : "carousel-item-right";
            var classNext = direct === "next" ? "carousel-item-next" : "carousel-item-prev";
            var interval;

            this.hook(slides, "_beforeupdate_", function (raw, oldRaw, i, node) {
                $.extend(true, raw.data, {
                    classes: {
                        "active": {init: i === d.index ? "add" : "remove"}
                    }
                });
            });

            this.hook(items, "_beforeupdate_", function (raw) {
                $.extend(true, raw.data, {
                    classes: {
                        "active": {init: "remove"}
                    }
                });
            });

            this.hook(prev, "_beforeupdate_", function(raw){
                $.extend(true, raw.data, {
                    classes: {
                        "active": {init: "add", delay: ["remove", 650]},
                        [classLeft]: {delay: [["add", 16], ["remove", 634]]}
                    }
                });
            });

            this.hook(next, "beforeupdate", function(raw){
                $.extend(true, raw.data, {
                    classes: {
                        "active": {delay: ["add", 650]},
                        [classNext]: {init: "add", delay: ["remove", 650]},
                        [classLeft]: {delay: [["add", 16], ["remove", 634]]}
                    }
                });
            });

            d.carousing = true;
            carousel.data("_carousel_", d);
            setTimeout(function () {
                d.carousing = false;
            }, 680);

            this.update();

            interval = next.data("interval") || 5000;
            this.c.carousel._setInterval.call(this, interval, carousel, d);
        },

        autoplay: function (carousels) {
            var that = this;
            carousels.each(function (i, node) {
                var carousel = $(node);
                var d = carousel.data("_carousel_") || {};
                var interval = carousel.find(".carousel-item.active").data("interval") || 5000;

                that.c.carousel._setInterval.call(that, interval, carousel, d);
            });
        },

        _setInterval: function(interval, carousel, d){
            var that = this;

            clearInterval(d.interval);
            d.ride = d.ride || carousel.data("ride");
            if(d.ride === "carousel"){
                d.interval = setInterval(function () {
                    that.c.carousel._next.call(that, carousel, d);
                }, interval);
                carousel.data("_carousel_", d);
            }
        },

        clear: function (carousels) {
            carousels.each(function (i, node) {
                var d = $(node).data("_carousel_") || {};
                if(d.interval){
                    clearInterval(d.interval);
                }
            });
        }
    });

});
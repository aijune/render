import $ from "../jquery/index";
import Widget from "../widget/index";

const render = function(element, widget, options){
    if(widget.renders){
        widget = render.widget("render" + $.widgetUuid++, widget);
    }
    new widget( element, options || {} );
};

render.jquery = $;
render.Widget = Widget;
render.widgets = {};
render.widget = function( name, base, prototype ) {
    var constructor, basePrototype;
    var proxiedPrototype = {};

    if ( !prototype ) {
        prototype = base;
        base = render.Widget;
    }

    constructor = render.widgets[ name ] = function( element, options ) {
        if ( !this._createWidget ) {
            return new constructor( element, options );
        }
        if ( arguments.length ) {
            this._createWidget( element, options );
        }
    };

    constructor._childConstructors = [];
    basePrototype = new base();
    basePrototype.options = $.widgetExtend( {}, basePrototype.options );

    $.each( prototype, function( prop, value ) {
        if ( !$.isFunction( value ) ) {
            proxiedPrototype[ prop ] = value;
            return;
        }
        proxiedPrototype[ prop ] = ( function() {
            function _super() {
                return base.prototype[ prop ].apply( this, arguments );
            }

            function _superApply( args ) {
                return base.prototype[ prop ].apply( this, args );
            }

            return function() {
                var __super = this._super;
                var __superApply = this._superApply;
                var returnValue;

                this._super = _super;
                this._superApply = _superApply;

                returnValue = value.apply( this, arguments );

                this._super = __super;
                this._superApply = __superApply;

                return returnValue;
            };
        } )();
    } );
    constructor.prototype = $.widgetExtend( basePrototype, proxiedPrototype, {
        constructor: constructor,
        widgetName: name
    } );

    base._childConstructors.push( constructor );
    return constructor;
};

export default render;

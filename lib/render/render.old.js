define(["jquery"], function ($) {

    ////----widget

    var widgetUuid = 0;
    var widgetSlice = Array.prototype.slice;

    $.cleanData = ( function( orig ) {
        return function( elems ) {
            var events, elem, i;
            for ( i = 0; ( elem = elems[ i ] ) != null; i++ ) {
                try {

                    // Only trigger remove when necessary to save time
                    events = $._data( elem, "events" );
                    if ( events && events.remove ) {
                        $( elem ).triggerHandler( "remove" );
                    }

                    // Http://bugs.jquery.com/ticket/8235
                } catch ( e ) {}
            }
            orig( elems );
        };
    } )( $.cleanData );

    $.widget = function( name, base, prototype ) {
        var existingConstructor, constructor, basePrototype;

        // ProxiedPrototype allows the provided prototype to remain unmodified
        // so that it can be used as a mixin for multiple widgets (#8876)
        var proxiedPrototype = {};

        var namespace = name.split( "." )[ 0 ];
        name = name.split( "." )[ 1 ];
        var fullName = namespace + "-" + name;

        if ( !prototype ) {
            prototype = base;
            base = $.Widget;
        }

        if ( $.isArray( prototype ) ) {
            prototype = $.extend.apply( null, [ {} ].concat( prototype ) );
        }

        // Create selector for plugin
        $.expr[ ":" ][ fullName.toLowerCase() ] = function( elem ) {
            return !!$.data( elem, fullName );
        };

        $[ namespace ] = $[ namespace ] || {};
        existingConstructor = $[ namespace ][ name ];
        constructor = $[ namespace ][ name ] = function( options, element ) {

            // Allow instantiation without "new" keyword
            if ( !this._createWidget ) {
                return new constructor( options, element );
            }

            // Allow instantiation without initializing for simple inheritance
            // must use "new" keyword (the code above always passes args)
            if ( arguments.length ) {
                this._createWidget( options, element );
            }
        };

        // Extend with the existing constructor to carry over any static properties
        $.extend( constructor, existingConstructor, {
            version: prototype.version,

            // Copy the object used to create the prototype in case we need to
            // redefine the widget later
            _proto: $.extend( {}, prototype ),

            // Track widgets that inherit from this widget in case this widget is
            // redefined after a widget inherits from it
            _childConstructors: []
        } );

        basePrototype = new base();

        // We need to make the options hash a property directly on the new instance
        // otherwise we'll modify the options hash on the prototype that we're
        // inheriting from
        basePrototype.options = $.widget.extend( {}, basePrototype.options );
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
        constructor.prototype = $.widget.extend( basePrototype, {

            // TODO: remove support for widgetEventPrefix
            // always use the name + a colon as the prefix, e.g., draggable:start
            // don't prefix for widgets that aren't DOM-based
            widgetEventPrefix: existingConstructor ? ( basePrototype.widgetEventPrefix || name ) : name
        }, proxiedPrototype, {
            constructor: constructor,
            namespace: namespace,
            widgetName: name,
            widgetFullName: fullName
        } );

        // If this widget is being redefined then we need to find all widgets that
        // are inheriting from it and redefine all of them so that they inherit from
        // the new version of this widget. We're essentially trying to replace one
        // level in the prototype chain.
        if ( existingConstructor ) {
            $.each( existingConstructor._childConstructors, function( i, child ) {
                var childPrototype = child.prototype;

                // Redefine the child widget using the same prototype that was
                // originally used, but inherit from the new version of the base
                $.widget( childPrototype.namespace + "." + childPrototype.widgetName, constructor,
                    child._proto );
            } );

            // Remove the list of existing child constructors from the old constructor
            // so the old child constructors can be garbage collected
            delete existingConstructor._childConstructors;
        } else {
            base._childConstructors.push( constructor );
        }

        $.widget.bridge( name, constructor );

        return constructor;
    };

    $.widget.extend = function( target ) {
        var input = widgetSlice.call( arguments, 1 );
        var inputIndex = 0;
        var inputLength = input.length;
        var key;
        var value;

        for ( ; inputIndex < inputLength; inputIndex++ ) {
            for ( key in input[ inputIndex ] ) {
                value = input[ inputIndex ][ key ];
                if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {

                    // Clone objects
                    if ( $.isPlainObject( value ) ) {
                        target[ key ] = $.isPlainObject( target[ key ] ) ?
                            $.widget.extend( {}, target[ key ], value ) :

                            // Don't extend strings, arrays, etc. with objects
                            $.widget.extend( {}, value );

                        // Copy everything else by reference
                    } else {
                        target[ key ] = value;
                    }
                }
            }
        }
        return target;
    };

    $.widget.bridge = function( name, object ) {
        var fullName = object.prototype.widgetFullName || name;
        $.fn[ name ] = function( options ) {
            var isMethodCall = typeof options === "string";
            var args = widgetSlice.call( arguments, 1 );
            var returnValue = this;

            if ( isMethodCall ) {

                // If this is an empty collection, we need to have the instance method
                // return undefined instead of the jQuery instance
                if ( !this.length && options === "instance" ) {
                    returnValue = undefined;
                } else {
                    this.each( function() {
                        var methodValue;
                        var instance = $.data( this, fullName );

                        if ( options === "instance" ) {
                            returnValue = instance;
                            return false;
                        }

                        if ( !instance ) {
                            return $.error( "cannot call methods on '" + name +
                                "' prior to initialization; " +
                                "attempted to call method '" + options + "'" );
                        }

                        if ( !$.isFunction( instance[ options ] ) || options.charAt( 0 ) === "_" ) {
                            return $.error( "no such method '" + options + "' for " + name +
                                " widget instance" );
                        }

                        methodValue = instance[ options ].apply( instance, args );

                        if ( methodValue !== instance && methodValue !== undefined ) {
                            returnValue = methodValue && methodValue.jquery ?
                                returnValue.pushStack( methodValue.get() ) :
                                methodValue;
                            return false;
                        }
                    } );
                }
            } else {

                // Allow multiple hashes to be passed on init
                if ( args.length ) {
                    options = $.widget.extend.apply( null, [ options ].concat( args ) );
                }

                this.each( function() {
                    var instance = $.data( this, fullName );
                    if ( instance ) {
                        instance.option( options || {} );
                        if ( instance._init ) {
                            instance._init();
                        }
                    } else {
                        $.data( this, fullName, new object( options, this ) );
                    }
                } );
            }

            return returnValue;
        };
    };

    $.Widget = function( /* options, element */ ) {};
    $.Widget._childConstructors = [];

    $.Widget.prototype = {
        widgetName: "widget",
        widgetEventPrefix: "",
        defaultElement: "<div>",

        options: {
            classes: {},
            disabled: false,

            // Callbacks
            create: null
        },

        _createWidget: function( options, element ) {
            element = $( element || this.defaultElement || this )[ 0 ];
            this.element = $( element );
            this.uuid = widgetUuid++;
            this.eventNamespace = "." + this.widgetName + this.uuid;

            this.bindings = $();
            this.hoverable = $();
            this.focusable = $();
            this.classesElementLookup = {};

            if ( element !== this ) {
                $.data( element, this.widgetFullName, this );
                this._on( true, this.element, {
                    remove: function( event ) {
                        if ( event.target === element ) {
                            this.destroy();
                        }
                    }
                } );
                this.document = $( element.style ?

                    // Element within the document
                    element.ownerDocument :

                    // Element is window or document
                    element.document || element );
                this.window = $( this.document[ 0 ].defaultView || this.document[ 0 ].parentWindow );
            }

            this.options = $.widget.extend( {},
                this.options,
                this._getCreateOptions(),
                options );

            this._create();

            if ( this.options.disabled ) {
                this._setOptionDisabled( this.options.disabled );
            }

            this._trigger( "create", null, this._getCreateEventData() );
            this._init();
        },

        _getCreateOptions: function() {
            return {};
        },

        _getCreateEventData: $.noop,

        _create: $.noop,

        _init: $.noop,

        destroy: function() {
            var that = this;

            this._destroy();
            $.each( this.classesElementLookup, function( key, value ) {
                that._removeClass( value, key );
            } );

            // We can probably remove the unbind calls in 2.0
            // all event bindings should go through this._on()
            this.element
                .off( this.eventNamespace )
                .removeData( this.widgetFullName );
            this.widget()
                .off( this.eventNamespace )
                .removeAttr( "aria-disabled" );

            // Clean up events and states
            this.bindings.off( this.eventNamespace );
        },

        _destroy: $.noop,

        widget: function() {
            return this.element;
        },

        option: function( key, value ) {
            var options = key;
            var parts;
            var curOption;
            var i;

            if ( arguments.length === 0 ) {

                // Don't return a reference to the internal hash
                return $.widget.extend( {}, this.options );
            }

            if ( typeof key === "string" ) {

                // Handle nested keys, e.g., "foo.bar" => { foo: { bar: ___ } }
                options = {};
                parts = key.split( "." );
                key = parts.shift();
                if ( parts.length ) {
                    curOption = options[ key ] = $.widget.extend( {}, this.options[ key ] );
                    for ( i = 0; i < parts.length - 1; i++ ) {
                        curOption[ parts[ i ] ] = curOption[ parts[ i ] ] || {};
                        curOption = curOption[ parts[ i ] ];
                    }
                    key = parts.pop();
                    if ( arguments.length === 1 ) {
                        return curOption[ key ] === undefined ? null : curOption[ key ];
                    }
                    curOption[ key ] = value;
                } else {
                    if ( arguments.length === 1 ) {
                        return this.options[ key ] === undefined ? null : this.options[ key ];
                    }
                    options[ key ] = value;
                }
            }

            this._setOptions( options );

            return this;
        },

        _setOptions: function( options ) {
            var key;

            for ( key in options ) {
                this._setOption( key, options[ key ] );
            }

            return this;
        },

        _setOption: function( key, value ) {
            if ( key === "classes" ) {
                this._setOptionClasses( value );
            }

            this.options[ key ] = value;

            if ( key === "disabled" ) {
                this._setOptionDisabled( value );
            }

            return this;
        },

        _setOptionClasses: function( value ) {
            var classKey, elements, currentElements;

            for ( classKey in value ) {
                currentElements = this.classesElementLookup[ classKey ];
                if ( value[ classKey ] === this.options.classes[ classKey ] ||
                    !currentElements ||
                    !currentElements.length ) {
                    continue;
                }

                // We are doing this to create a new jQuery object because the _removeClass() call
                // on the next line is going to destroy the reference to the current elements being
                // tracked. We need to save a copy of this collection so that we can add the new classes
                // below.
                elements = $( currentElements.get() );
                this._removeClass( currentElements, classKey );

                // We don't use _addClass() here, because that uses this.options.classes
                // for generating the string of classes. We want to use the value passed in from
                // _setOption(), this is the new value of the classes option which was passed to
                // _setOption(). We pass this value directly to _classes().
                elements.addClass( this._classes( {
                    element: elements,
                    keys: classKey,
                    classes: value,
                    add: true
                } ) );
            }
        },

        _setOptionDisabled: function( value ) {
            this._toggleClass( this.widget(), this.widgetFullName + "-disabled", null, !!value );

            // If the widget is becoming disabled, then nothing is interactive
            if ( value ) {
                this._removeClass( this.hoverable, null, "ui-state-hover" );
                this._removeClass( this.focusable, null, "ui-state-focus" );
            }
        },

        enable: function() {
            return this._setOptions( { disabled: false } );
        },

        disable: function() {
            return this._setOptions( { disabled: true } );
        },

        _classes: function( options ) {
            var full = [];
            var that = this;

            options = $.extend( {
                element: this.element,
                classes: this.options.classes || {}
            }, options );

            function processClassString( classes, checkOption ) {
                var current, i;
                for ( i = 0; i < classes.length; i++ ) {
                    current = that.classesElementLookup[ classes[ i ] ] || $();
                    if ( options.add ) {
                        current = $( $.unique( current.get().concat( options.element.get() ) ) );
                    } else {
                        current = $( current.not( options.element ).get() );
                    }
                    that.classesElementLookup[ classes[ i ] ] = current;
                    full.push( classes[ i ] );
                    if ( checkOption && options.classes[ classes[ i ] ] ) {
                        full.push( options.classes[ classes[ i ] ] );
                    }
                }
            }

            this._on( options.element, {
                "remove": "_untrackClassesElement"
            } );

            if ( options.keys ) {
                processClassString( options.keys.match( /\S+/g ) || [], true );
            }
            if ( options.extra ) {
                processClassString( options.extra.match( /\S+/g ) || [] );
            }

            return full.join( " " );
        },

        _untrackClassesElement: function( event ) {
            var that = this;
            $.each( that.classesElementLookup, function( key, value ) {
                if ( $.inArray( event.target, value ) !== -1 ) {
                    that.classesElementLookup[ key ] = $( value.not( event.target ).get() );
                }
            } );
        },

        _removeClass: function( element, keys, extra ) {
            return this._toggleClass( element, keys, extra, false );
        },

        _addClass: function( element, keys, extra ) {
            return this._toggleClass( element, keys, extra, true );
        },

        _toggleClass: function( element, keys, extra, add ) {
            add = ( typeof add === "boolean" ) ? add : extra;
            var shift = ( typeof element === "string" || element === null ),
                options = {
                    extra: shift ? keys : extra,
                    keys: shift ? element : keys,
                    element: shift ? this.element : element,
                    add: add
                };
            options.element.toggleClass( this._classes( options ), add );
            return this;
        },

        _on: function( suppressDisabledCheck, element, handlers ) {
            var delegateElement;
            var instance = this;

            // No suppressDisabledCheck flag, shuffle arguments
            if ( typeof suppressDisabledCheck !== "boolean" ) {
                handlers = element;
                element = suppressDisabledCheck;
                suppressDisabledCheck = false;
            }

            // No element argument, shuffle and use this.element
            if ( !handlers ) {
                handlers = element;
                element = this.element;
                delegateElement = this.widget();
            } else {
                element = delegateElement = $( element );
                this.bindings = this.bindings.add( element );
            }

            $.each( handlers, function( event, handler ) {
                function handlerProxy() {

                    // Allow widgets to customize the disabled handling
                    // - disabled as an array instead of boolean
                    // - disabled class as method for disabling individual parts
                    if ( !suppressDisabledCheck &&
                        ( instance.options.disabled === true ||
                            $( this ).hasClass( "ui-state-disabled" ) ) ) {
                        return;
                    }
                    return ( typeof handler === "string" ? instance[ handler ] : handler )
                        .apply( instance, arguments );
                }

                // Copy the guid so direct unbinding works
                if ( typeof handler !== "string" ) {
                    handlerProxy.guid = handler.guid =
                        handler.guid || handlerProxy.guid || $.guid++;
                }

                var match = event.match( /^([\w:-]*)\s*(.*)$/ );
                var eventName = match[ 1 ] + instance.eventNamespace;
                var selector = match[ 2 ];

                if ( selector ) {
                    delegateElement.on( eventName, selector, handlerProxy );
                } else {
                    element.on( eventName, handlerProxy );
                }
            } );
        },

        _off: function( element, eventName ) {
            eventName = ( eventName || "" ).split( " " ).join( this.eventNamespace + " " ) +
                this.eventNamespace;
            element.off( eventName ).off( eventName );

            // Clear the stack to avoid memory leaks (#10056)
            this.bindings = $( this.bindings.not( element ).get() );
            this.focusable = $( this.focusable.not( element ).get() );
            this.hoverable = $( this.hoverable.not( element ).get() );
        },

        _delay: function( handler, delay ) {
            function handlerProxy() {
                return ( typeof handler === "string" ? instance[ handler ] : handler )
                    .apply( instance, arguments );
            }
            var instance = this;
            return setTimeout( handlerProxy, delay || 0 );
        },

        _hoverable: function( element ) {
            this.hoverable = this.hoverable.add( element );
            this._on( element, {
                mouseenter: function( event ) {
                    this._addClass( $( event.currentTarget ), null, "ui-state-hover" );
                },
                mouseleave: function( event ) {
                    this._removeClass( $( event.currentTarget ), null, "ui-state-hover" );
                }
            } );
        },

        _focusable: function( element ) {
            this.focusable = this.focusable.add( element );
            this._on( element, {
                focusin: function( event ) {
                    this._addClass( $( event.currentTarget ), null, "ui-state-focus" );
                },
                focusout: function( event ) {
                    this._removeClass( $( event.currentTarget ), null, "ui-state-focus" );
                }
            } );
        },

        _trigger: function( type, event, data ) {
            var prop, orig;
            var callback = this.options[ type ];

            data = data || {};
            event = $.Event( event );
            event.type = ( type === this.widgetEventPrefix ?
                type :
                this.widgetEventPrefix + type ).toLowerCase();

            // The original event may come from any element
            // so we need to reset the target on the new event
            event.target = this.element[ 0 ];

            // Copy original event properties over to the new event
            orig = event.originalEvent;
            if ( orig ) {
                for ( prop in orig ) {
                    if ( !( prop in event ) ) {
                        event[ prop ] = orig[ prop ];
                    }
                }
            }

            this.element.trigger( event, data );
            return !( $.isFunction( callback ) &&
                callback.apply( this.element[ 0 ], [ event ].concat( data ) ) === false ||
                event.isDefaultPrevented() );
        }
    };

    $.each( { show: "fadeIn", hide: "fadeOut" }, function( method, defaultEffect ) {
        $.Widget.prototype[ "_" + method ] = function( element, options, callback ) {
            if ( typeof options === "string" ) {
                options = { effect: options };
            }

            var hasOptions;
            var effectName = !options ?
                method :
                options === true || typeof options === "number" ?
                    defaultEffect :
                    options.effect || defaultEffect;

            options = options || {};
            if ( typeof options === "number" ) {
                options = { duration: options };
            }

            hasOptions = !$.isEmptyObject( options );
            options.complete = callback;

            if ( options.delay ) {
                element.delay( options.delay );
            }

            if ( hasOptions && $.effects && $.effects.effect[ effectName ] ) {
                element[ method ]( options );
            } else if ( effectName !== method && element[ effectName ] ) {
                element[ effectName ]( options.duration, options.easing, callback );
            } else {
                element.queue( function( next ) {
                    $( this )[ method ]();
                    if ( callback ) {
                        callback.call( element[ 0 ] );
                    }
                    next();
                } );
            }
        };
    } );

    var widget = $.widget;


    /*!
     * jQuery UI :data 1.12.1
     * http://jqueryui.com
     *
     * Copyright jQuery Foundation and other contributors
     * Released under the MIT license.
     * http://jquery.org/license
     */

    //>>label: :data Selector
    //>>group: Core
    //>>description: Selects elements which have data stored under the specified key.
    //>>docs: http://api.jqueryui.com/data-selector/


    var data = $.extend( $.expr[ ":" ], {
        data: $.expr.createPseudo ?
            $.expr.createPseudo( function( dataName ) {
                return function( elem ) {
                    return !!$.data( elem, dataName );
                };
            } ) :

            // Support: jQuery <1.8
            function( elem, i, match ) {
                return !!$.data( elem, match[ 3 ] );
            }
    } );


    var Sel = function (data, fragment, parent, node) {

        var i, value;

        this.fragment = fragment;
        this.widget = fragment.renderWidget;
        this.parent = parent;
        this.node = node;

        //--

        if(typeof data[0] === "boolean"){
            this.remove = !data[0];
            this.sel = data[1];
            i = 2;
        }
        else{
            this.sel = data[0];
            i = 1;
        }

        for( ; i < data.length; i++){

            value = data[i];

            if($.isPlainObject(value)){
                this._setData(value);
            }
            else if($.isArray(value)){
                this._setChildren(value);
            }
            else{
                this.text = String(value);
            }
        }

        this.sel = this.sel.replace(/\s+/g, ".");
        this.remove = this.remove || false;
        this.data = this.data || {};
        this.children = this.children || [];
        this.text = this.text || "";

        if(
            this.sel[0] === "s" && this.sel[1] === "v" && this.sel[2] === "g" &&
            (this.sel.length === 3 || this.sel[3] === "." || this.sel[3] === "#")
        ) {
            this._addNS(this.data, this.children);
        }
    };

    Sel.prototype = {

        constructor: Sel,

        isSel: true,

        _addNS: function(data, children){

            data.ns = "http://www.w3.org/2000/svg";

            $.each(children, function (i, child){
                child._addNS(child.data, child.children);
            });
        },

        _setData: function(value){

            var that = this;
            var data = this.data = {};
            var hooks = {}, match;

            $.each(value, function(k, v){
                if(k === "key"){
                    that.key = v;
                }
                else if(k === "style" && typeof v !== "string"){
                    data.style = v;
                }
                else if(k === "class" && typeof v !== "string"){
                    if($.isArray(v)){
                        that._setClasses(v);
                    }else{
                        data.classes = v;
                    }
                }
                else if(k === "props"){
                    data.props = v;
                }
                else if(k === "dataset"){
                    data.dataset = v;
                }
                else if(match = k.match(/^on(\w+)$/)){
                    if(
                        $.inArray(match[1], [
                            "beforecreate",
                            "created",
                            "mounted",
                            "beforepatch",
                            "beforeupdate",
                            "updated",
                            "patched",
                            "destroy",
                            "remove",
                            "model",
                            "validate",
                            "reset"
                        ]) > -1
                    ){
                        hooks[match[1]] = v;
                    }
                    else{
                        data.events = data.events || {};
                        data.events[match[1]] = v;
                    }
                }
                else{

                    if(k.indexOf("data") === 0){

                        k = k.replace(/\B([A-Z])/g, '-$1').toLowerCase();

                        if(k === "data-validate"){
                            if(value.name){
                                that.fragment.instValidate.set(value.name, {sel: that, data: v});
                            }
                            else if(value.dataValidateName){
                                that.fragment.instValidate.set(value.dataValidateName, {_sel: that, data: v});
                            }
                        }
                    }
                    else if(k.indexOf("aria") === 0){
                        k = k.replace(/\B([A-Z])/g, '-$1').toLowerCase();
                    }

                    data.attrs = data.attrs || {};
                    data.attrs[k] = typeof v === "object" ? JSON.stringify(v) : v;

                    if(k === "name"){
                        that.fragment.instModel.setName(v, value, that);
                    }
                    else if(k === "value" && !value.name){
                        that.fragment.instModel.setValue(v, value, that);
                    }
                }
            });

            this._setHooks(hooks);
        },

        _setClasses: function (value) {

            var classes = this.data.classes = {};

            $.each(value, function(i, v){
                if(v.name){
                    classes[v.name] = {
                        init: v.init,
                        delay: v.delay,
                        destroy: v.destroy,
                        remove: v.remove
                    };
                }
            });
        },

        _setHooks: function(value){

            var that = this;
            var args = [];
            var slice = args.slice;
            var hooks = this.data.hooks = {};

            $.each(value, function (key, value) {

                if($.isArray(value)){
                    args = slice.call(value, 1);
                    value = value[0];
                }

                hooks[key] = function () {

                    var isString = typeof value === "string";

                    if(isString && (!that.widget || !that.widget[value])){
                        $.error("Widget does not exist or widget method \"" + value + "\" does not exist.");
                    }

                    return ( isString ? that.widget[value] : value )
                        .apply(that.widget || that.fragment, args.concat(slice.call(arguments, 0)));
                };
            });
        },

        _setChildren: function(value){

            var that = this;

            $.each(value, function(i, v){

                var args = [];
                var child;

                if($.isArray(v)){
                    if(typeof v[0] === "string" && v[0].charAt(0) === "_"){
                        args = v.slice(1);
                        v = v[0];
                    }else{
                        that._pushChild(v);
                    }
                }

                if(typeof v === "string"){

                    if(!that.widget || !that.widget[v]){
                        $.error("Widget does not exist or widget method \"" + v + "\" does not exist.");
                    }

                    child = that.widget[v].apply(that.widget, args);
                    that._pushChild(child);
                }
            });
        },

        _pushChild: function (child) {
            child = new Sel(child, this.fragment, this);
            if(!child.remove){
                this.children = this.children || [];
                this.children.push(child);
            }
        }
    };


    ////----

    var selReg = /^([\w-]+)(?:#([\w-]+))?(?:\.([\.\w-]+))?$/;

    var Dom = function(){};

    Dom.prototype = {

        constructor: Dom,

        createSelByNode: function(node, sel){
            var id = node.id ? "#" + node.id : "";
            var classes = node.className ? "." + node.className.split(/\s+/).join(".") : "";
            return new Sel([node.tagName.toLowerCase() + id + classes], (sel ? sel.fragment : $(node).data("ui-fragment")), undefined, $(node).empty()[0]);
        },

        sameSel: function(oldSel, sel){
            return oldSel.key === sel.key && oldSel.sel === sel.sel;
        },

        updateBase: function(oldSel, sel, prop, callbacks){

            var oldProp, key;
            var newProp = sel.data[prop] || {};
            var elem = sel.node;

            if(oldSel && (oldProp = oldSel.data[prop] || {})){
                for(key in oldProp){
                    if(newProp[key] == null){
                        callbacks.remove.call(this, elem, key);
                    }
                }
            }

            if(callbacks.hook){
                callbacks.hook.call(this, elem, oldProp, newProp, callbacks);
                return;
            }

            if(oldProp){
                for(key in newProp){
                    if(oldProp[key] !== newProp[key]){
                        callbacks.add.call(this, elem, key, newProp[key]);
                    }
                }
            }else{
                for(key in newProp){
                    callbacks.add.call(this, elem, key, newProp[key]);
                }
            }
        },

        updateAttrs: function(oldSel, sel){

            var that = this;

            this.updateBase(oldSel, sel, "attrs", {

                add: function (elem, key, value) {
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val(value);
                    }else{
                        $(elem).attr(key, value);
                    }
                },

                remove: function (elem, key) {
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val("");
                    }else{
                        $(elem).removeAttr(key);
                    }
                }
            });
        },

        updateProps: function(oldSel, sel){

            var that = this;

            this.updateBase(oldSel, sel, "props", {

                add: function(elem, key, value){
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val(value);
                    }else{
                        $(elem).prop(key, value);
                    }
                },

                remove: function(elem, key){
                    if(key === "value" && that.isFormElem(elem)){
                        $(elem).val("");
                    }else{
                        $(elem).removeProp(key);
                    }
                }

            });
        },

        isFormElem: function (elem){
            return $.inArray(elem.tagName.toLowerCase(), ["input", "select", "textarea"]) > -1;
        },

        updateStyle: function(oldSel, sel) {

            this.updateBase(oldSel, sel, "style", {

                add: function(elem, key, value){

                    if($.isFunction(value)){
                        value = value.call(sel.widget || sel.fragment.element[0], sel, oldSel);
                    }

                    $(elem).css(key, value);
                },

                remove: function(elem, key){
                    $(elem).css(key, "");
                }

            });
        },

        updateDataset: function(oldSel, sel){

            this.updateBase(oldSel, sel, "dataset", {

                add: function(elem, key, value){
                    $(elem).data(key, value);
                },

                remove: function(elem, key){
                    $(elem).removeData(key);
                }

            });
        },

        nextFrame: function(callback, time){
            var that = this;
            var timeout;

            if(time){
                setTimeout(function(){
                    callback.call(that);
                }, time);
            }
            else{
                timeout = window.requestAnimationFrame || window.setTimeout;
                timeout(function(){
                    timeout(function () {
                        callback.call(that);
                    });
                });
            }
        },

        updateClasses: function(oldSel, sel) {

            var that = this;

            this.updateBase(oldSel, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

                    $.each(classes, function(key, value){

                        var delay, time, d, t;

                        delay = value.delay;

                        if($.isArray(value.delay)){
                            time = value.delay[1];
                            delay = value.delay[0];
                            if($.isArray(time)){
                                d = time[0];
                                t = time[1];
                                time = undefined;
                            }
                            if($.isArray(delay)){
                                time = delay[1];
                                delay = delay[0];
                            }
                        }

                        if($(elem).hasClass(key)){
                            if(value.init === "add"){
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                callbacks.remove.call(that, elem, key);
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, elem, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }else{
                            if(value.init === "add"){
                                callbacks.add.call(that, elem, key);
                                if(delay === "remove"){
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        if(d === "add"){
                                            that.nextFrame(function(){
                                                callbacks.add.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }else{
                                if(delay === "add"){
                                    that.nextFrame(function(){
                                        callbacks.add.call(that, elem, key);
                                        if(d === "remove"){
                                            that.nextFrame(function(){
                                                callbacks.remove.call(that, elem, key);
                                            }, t);
                                        }
                                    }, time);
                                }
                            }
                        }
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }
            });
        },

        updateEvents: function(oldSel, sel){

            var that = this;
            var reg = /^([\w:-]*)\s*(.*)$/;

            this.updateBase(oldSel, sel, "events", {

                hook: function(elem, oldEvents, events, callbacks){

                    $.each(events, function(key, value){

                        if(!oldEvents || !oldEvents[key]){
                            callbacks.add.call(that, elem, key, value);
                        }
                        else{
                            callbacks.remove.call(that, elem, key);
                            callbacks.add.call(that, elem, key, value);
                        }
                    });
                },

                add: function(elem, key, value){
                    var match = key.match(reg);
                    var eventName = match[1] + sel.fragment.eventNamespace;
                    var selector = match[2];
                    var args = [];
                    var slice = args.slice;

                    if($.isArray(value)){
                        args = slice.call(value, 1);
                        value = value[0];
                    }

                    function handlerProxy(event) {

                        var isString = typeof value === "string";

                        if(isString && (!sel.widget || !sel.widget[value])){
                            $.error("Widget does not exist or widget method \"" + value + "\" does not exist.");
                        }

                        return ( isString ? sel.widget[value] : value )
                            .apply(sel.widget || sel.fragment, args.concat([event, sel]));
                    }

                    if ( typeof value !== "string" ) {
                        handlerProxy.guid = value.guid =
                            value.guid || handlerProxy.guid || $.guid++;
                    }

                    if(selector){
                        $(elem).on( eventName, selector, handlerProxy);
                    }else{
                        $(elem).on( eventName, handlerProxy);
                    }
                },

                remove: function(elem, key){
                    var match = key.match(reg);
                    $(elem).off(match[1] + sel.fragment.eventNamespace);
                }
            });
        },

        destroyEvents: function(sel) {
            if(sel.data.events){
                $(sel.node).off(sel.fragment.eventNamespace);
            }
        },

        destroyClasses: function(sel) {

            var that = this;

            this.updateBase(null, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

                    $.each(classes, function(key, value){
                        if(value.destroy === "add"){
                            callbacks.add.call(that, elem, key);
                        }
                        else if(value.destroy === "remove"){
                            callbacks.remove.call(that, elem, key);
                        }
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }

            });
        },

        removeClasses(sel, rm) {

            var that = this;

            this.updateBase(null, sel, "classes", {

                hook: function(elem, oldClasses, classes, callbacks){

                    var dfds = [];

                    if($.isEmptyObject(classes)){
                        rm();
                        return;
                    }

                    $.each(classes, function(key, value){

                        var time;

                        if($.isArray(value.remove)){
                            time = value.remove[1];
                            value.remove = value.remove[0];
                        }

                        if(value.remove === "add"){
                            callbacks.add.call(that, elem, key);
                        }
                        else if(value.remove === "remove"){
                            if(time){
                                dfds.push($.Deferred(function (dfd) {
                                    that.nextFrame(function(){
                                        callbacks.remove.call(that, elem, key);
                                        dfd.resolve();
                                    }, time);
                                }));
                            }
                            else{
                                callbacks.remove.call(that, elem, key);
                            }
                        }
                    });

                    $.when.apply($, dfds).done(function () {
                        rm();
                    });
                },

                add: function(elem, key){
                    $(elem).addClass(key);
                },

                remove: function(elem, key){
                    $(elem).removeClass(key);
                }
            });
        },

        createElemBySel: function(sel, mountedQueue) {
            var that = this;
            var data = sel.data;
            var hooks = data.hooks;
            var beforeCreate = hooks && hooks.beforecreate;
            var selector, children, match, elem, $elem;

            if(beforeCreate){
                beforeCreate.call(sel.widget || sel.fragment, sel);
                data = sel.data;
                hooks = data.hooks;
            }

            selector = sel.sel;
            children = sel.children;

            if(selector === "!"){
                sel.node = document.createComment(text);
            }else{
                match = selReg.exec(selector);
                elem = sel.node = data.ns ? document.createElementNS(data.ns, match[1])
                    : document.createElement(match[1]);
                if(match[2]){
                    elem.setAttribute("id", match[2]);
                }
                if(match[3]){
                    elem.setAttribute("class", match[3].split(".").join(" "));
                }

                this.updateAttrs(null, sel);
                this.updateProps(null, sel);
                this.updateStyle(null, sel);
                this.updateDataset(null, sel);
                this.updateClasses(null, sel);
                this.updateEvents(null, sel);

                $elem = $(elem).data("_sel", sel);

                if(children.length){
                    $.each(children, function(i, child){
                        $elem.append(that.createElemBySel(child, mountedQueue));
                    });
                }else{
                    $elem.html(sel.text);
                }

                if(hooks){
                    if(hooks.created){
                        hooks.created.call(sel.widget || sel.fragment, sel);
                    }
                    if(hooks.mounted){
                        mountedQueue && mountedQueue.push(sel);
                    }
                }
            }

            return sel.node;
        },

        triggerDestroyHook(sel) {
            var that = this;
            var hooks = sel.data.hooks;

            if(hooks && hooks.destroy){
                hooks.destroy.call(sel.widget || sel.fragment, sel);
            }

            this.destroyClasses(sel);
            this.destroyEvents(sel);

            $.each(sel.children, function(i, child){
                that.triggerDestroyHook(child);
            });
        },

        removeSels(sels, startIdx, endIdx) {
            var sel, rm, hooks;
            for (; startIdx <= endIdx; ++startIdx) {
                sel = sels[startIdx];
                if(sel){
                    this.triggerDestroyHook(sel);
                    rm = (function(node, count){
                        return function(){
                            if(--count < 1){
                                $(node).remove();
                            }
                        };
                    })(sel.node, 2);
                    this.removeClasses(sel, rm);
                    hooks = sel.data.hooks;
                    if(hooks && hooks.remove){
                        hooks.remove.call(sel.widget || sel.fragment, sel, rm);
                    }else{
                        rm();
                    }
                }
            }
        },

        createKeyToIdx: function(sels, startIdx, endIdx) {
            var i, map = {}, sel, key;
            for (i = startIdx; i <= endIdx; ++i) {
                sel = sels[i];
                if(sel && (key = sel.key)){
                    map[key] = i;
                }
            }
            return map;
        },

        addSels: function(parentElem, afterElem, sels, startIdx, endIdx, mountedQueue) {
            var sel;
            for (; startIdx <= endIdx; ++startIdx) {
                sel = sels[startIdx];
                if (sel) {
                    this.createElemBySel(sel, mountedQueue);
                    afterElem ? $(sel.node).insertBefore(afterElem) : $(sel.node).appendTo(parentElem);
                }
            }
        },

        updateChildren(parentElem, oldC, newC, mountedQueue) {
            var oldStartIdx = 0, newStartIdx = 0;
            var oldEndIdx = oldC.length - 1;
            var oldStartSel = oldC[0];
            var oldEndSel = oldC[oldEndIdx];
            var newEndIdx = newC.length - 1;
            var newStartSel = newC[0];
            var newEndSel = newC[newEndIdx];
            var oldKeyToIdx;
            var oldIdx;
            var elemToMove;
            var afterElem;
            while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                if (oldStartSel == null) {
                    oldStartSel = oldC[++oldStartIdx];
                }
                else if (oldEndSel == null) {
                    oldEndSel = oldC[--oldEndIdx];
                }
                else if (newStartSel == null) {
                    newStartSel = newC[++newStartIdx];
                }
                else if (newEndSel == null) {
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldStartSel, newStartSel)) {
                    this.patchSel(oldStartSel, newStartSel, mountedQueue);
                    oldStartSel = oldC[++oldStartIdx];
                    newStartSel = newC[++newStartIdx];
                }
                else if (this.sameSel(oldEndSel, newEndSel)) {
                    this.patchSel(oldEndSel, newEndSel, mountedQueue);
                    oldEndSel = oldC[--oldEndIdx];
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldStartSel, newEndSel)) {
                    this.patchSel(oldStartSel, newEndSel, mountedQueue);
                    $(oldStartSel.node).insertAfter(oldEndSel.node);
                    oldStartSel = oldC[++oldStartIdx];
                    newEndSel = newC[--newEndIdx];
                }
                else if (this.sameSel(oldEndSel, newStartSel)) {
                    this.patchSel(oldEndSel, newStartSel, mountedQueue);
                    $(oldEndSel.node).insertBefore(oldStartSel.node);
                    oldEndSel = oldC[--oldEndIdx];
                    newStartSel = newC[++newStartIdx];
                }
                else {
                    oldKeyToIdx = oldKeyToIdx || this.createKeyToIdx(oldC, oldStartIdx, oldEndIdx);
                    if(newStartSel.key
                        && (oldIdx = oldKeyToIdx[newStartSel.key])
                        && (elemToMove = oldC[oldIdx])
                        && (elemToMove.sel === newStartSel.sel)
                    ){
                        this.patchSel(elemToMove, newStartSel, mountedQueue);
                        oldC[oldIdx] = null;
                        $(elemToMove.node).insertBefore(oldStartSel.node);
                    }else{
                        $(this.createElemBySel(newStartSel, mountedQueue)).insertBefore(oldStartSel.node);
                    }
                    newStartSel = newC[++newStartIdx];
                }
            }
            if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                if (oldStartIdx > oldEndIdx) {
                    afterElem = newC[newEndIdx + 1] == null ? null : newC[newEndIdx + 1].node;
                    this.addSels(parentElem, afterElem, newC, newStartIdx, newEndIdx, mountedQueue);
                }
                else {
                    this.removeSels(oldC, oldStartIdx, oldEndIdx);
                }
            }
        },

        cloneHook: function(hook, sel, oldSel){
            var fn = oldSel.data.hooks && oldSel.data.hooks[hook];
            if(fn){
                fn.call(sel.widget || sel.fragment, sel, oldSel);
                if(fn.keep){
                    sel.data.hooks = sel.data.hooks || {};
                    sel.data.hooks[hook] = fn;
                }
            }
        },

        patchSel: function(oldSel, sel, mountedQueue, root) {
            var hooks = sel.data.hooks;
            var node, element, oldChildren, children;

            if(hooks && hooks.beforepatch){
                hooks.beforepatch.call(sel.widget || sel.fragment, sel, oldSel);
                hooks = sel.data.hooks;
            }

            node = sel.node = oldSel.node;
            element = $(node);

            if(!root){
                element.data("_sel", sel);
            }

            if(hooks && hooks.beforeupdate){
                hooks.beforeupdate.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_beforeupdate", sel, oldSel);

            if(sel.data.remove){
                return this.removeSels([sel], 0, 0);
            }

            this.updateAttrs(oldSel, sel);
            this.updateProps(oldSel, sel);
            this.updateStyle(oldSel, sel);
            this.updateDataset(oldSel, sel);
            this.updateClasses(oldSel, sel);
            this.updateEvents(oldSel, sel);

            if(hooks && hooks.updated){
                hooks.updated.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_updated", sel, oldSel);

            oldChildren = oldSel.children;
            children = sel.children;

            if(oldChildren.length && children.length){
                this.updateChildren(node, oldChildren, children, mountedQueue);
            }
            else if(children.length){
                if(oldSel.text){
                    element.html("");
                }
                this.addSels(node, null, children, 0, children.length - 1, mountedQueue);
            }
            else if(oldChildren.length){
                this.removeSels(oldChildren, 0, oldChildren.length - 1);
                element.html(sel.text);
            }else{
                if(oldSel.text !== sel.text){
                    element.html(sel.text);
                }
            }

            if (hooks && hooks.patched) {
                hooks.patched.call(sel.widget || sel.fragment, sel, oldSel);
            }
            this.cloneHook("_patched", sel, oldSel);
        },

        patch: function(oldSel, sel) {
            var mountedQueue = [];

            if(!oldSel && !sel){
                return;
            }

            if(!oldSel){
                this.createElemBySel(sel);
            }
            else if(!sel){
                if(!oldSel.isSel){
                    oldSel = this.createSelByNode(oldSel);
                }
                this.removeSels([oldSel], 0, 0);
            }
            else{
                if(!oldSel.isSel){
                    oldSel = this.createSelByNode(oldSel, sel);
                }

                this.patchSel(oldSel, sel, mountedQueue, true);

                $.each(mountedQueue, function(i, sel){
                    sel.data.hooks.mounted.call(sel.widget || sel.fragment, sel);
                });
            }

            return sel;
        }
    };

    var dom = new Dom();

    ////----

    var Model = function (fragment) {
        this.fragment = fragment;
        this.map = {};
        this.state = "init";
        this._map = {};
    };

    Model.prototype = {

        constructor: Model,

        init: function(){

            var that = this;
            var fragment = this.fragment;
            var updateProxy = function (event) {
                that.update.call(that, event);
            };
            var resetProxy = function(event){
                that.reset.call(that, event);
            };

            fragment.element
                .on("input" + fragment.eventNamespace, "input, textarea", updateProxy)
                .on("propertychange" + fragment.eventNamespace, "input, textarea", updateProxy)
                .on("change" + fragment.eventNamespace, "select", updateProxy)
                .on("reset" + fragment.eventNamespace, "form", resetProxy);

            $.each(this._map, function (name, data) {

                var item = that.map[name];

                if($.isArray(item.value) && !item.value.length){
                    item.value.push(data.value);
                    item.sel.push(data.sel);
                }
                else if(!item.value){
                    that.map[name] = data;
                }
            });

            this._mapReset = this._copy(this.map);
            this.state = "update";
        },

        _copy: function(map){

            var result = {};

            $.each(map, function (key, data) {
                result[key] = {
                    value: $.isArray(data.value) ? $.extend([], data.value) : data.value,
                    sel: data.sel
                }
            });

            return result;
        },

        get: function(name){

            if(name){
                return this.map[name];
            }
            else{
                return this.map;
            }

        },

        closestSel: function(tag, sel){
            while (sel && sel.sel.indexOf(tag) !== 0) {
                sel = sel.parent;
            }
            return sel;
        },

        setName: function(name, data, sel){

            if(this.state === "init"){
                this._setNameInit(name, data, sel);
            }
            else if(this.state === "update"){
                this._setNameUpdate(name, data, sel);
            }
        },

        _setNameInit: function(name, data, sel){

            var item = this.map[name] = this.map[name] || {};

            if(data.type === "radio"){
                item.value = item.value || "";
                item.sel = item.sel || null;
                if(data.checked){
                    item.value = data.value;
                    item.sel = sel;
                }
            }
            else if(data.type === "checkbox"){
                item.value = item.value || [];
                item.sel = item.sel || [];
                if(data.checked){
                    item.value.push(data.value);
                    item.sel.push(sel);
                }
            }
            else if(sel.sel.indexOf("select") !== 0){
                item.value = data.value;
                item.sel = sel;
            }
        },

        _setNameUpdate: function(name, data, sel){

            var item = this.map[name];

            if(data.type === "radio"){
                if(data.value === item.value){
                    sel.data.attrs.checked = data.checked = "checked";
                }
                else{
                    sel.data.attrs.checked = data.checked = undefined;
                }
            }
            else if(data.type === "checkbox"){
                if($.inArray(data.value, item.value) > -1){
                    sel.data.attrs.checked = data.checked = "checked";
                }
                else{
                    sel.data.attrs.checked = data.checked = undefined;
                }
            }
            else if(sel.sel.indexOf("select") !== 0){
                sel.data.attrs.value = data.value = item.value;
            }
        },

        setValue: function(value, data, sel){

            if(this.state === "init"){
                this._setValueInit(value, data, sel);
            }
            else if(this.state === "update"){
                this._setValueUpdate(value, data, sel);
            }

        },

        _setValueInit: function(value, data, sel){

            var name, p, attrs, item;

            if(sel.sel.indexOf("option") === 0){

                p = this.closestSel("select", sel);
                attrs = p.data.attrs || {};
                name = attrs.name;

                if(name){

                    if(!this._map[name]){
                        this._map[name] = {value: value, sel: sel};
                    }

                    item = this.map[name] = this.map[name] || {};

                    if(attrs.multiple){
                        item.value = item.value || [];
                        item.sel = item.sel || [];
                        if(data.selected){
                            item.value.push(value);
                            item.sel.push(sel);
                        }
                    }else{
                        item.value = item.value || "";
                        item.sel = item.sel || null;
                        if(data.selected){
                            item.value = value;
                            item.sel = sel;
                        }
                    }
                }
            }
        },

        _setValueUpdate: function(value, data, sel){
            var name, p, attrs, item;

            if(sel.sel.indexOf("option") === 0){
                p = this.closestSel("select", sel);
                attrs = p.data.attrs || {};
                name = attrs.name;

                if(name){
                    item = this.map[name];
                    if(attrs.multiple){
                        if($.inArray(value, item.value) > -1){
                            sel.data.attrs.selected = data.selected = "selected";
                        }
                        else{
                            sel.data.attrs.selected = data.selected = undefined;
                        }
                    }else{
                        if(value === item.value){
                            sel.data.attrs.selected = data.selected = "selected";
                        }
                        else{
                            sel.data.attrs.selected = data.selected = undefined;
                        }
                    }
                }
            }
        },

        reset: function(event){

            var that = this;

            this.map = this._copy(this._mapReset);

             $(event.currentTarget.elements).each(function (i, element) {

                 var sel, hooks, name, value;

                 element = $(element);
                 sel = element.data("_sel");
                 hooks = sel.data.hooks;
                 name = sel.data.attrs && sel.data.attrs.name;
                 value = name && that.map[name];

                 if(hooks){

                     if(hooks.model){
                         hooks.model.call(that.fragment.renderWidget, event, sel, value);
                     }

                     if(hooks.reset){
                         hooks.reset.call(that.fragment.renderWidget, event, sel, value);
                     }

                 }
             });
        },

        update: function(event){

            var target = $(event.currentTarget);
            var name = target.attr("name");

            if(!this.map.hasOwnProperty(name)){
                return false;
            }

            var sel = target.data("_sel");
            var attrs = sel.data.attrs;
            var validate = this.fragment.instValidate;
            var value;

            if(target.is("select")){

                value = {
                    value: [],
                    sel: []
                };

                target.find("option:selected").each(function (i, option) {
                    option = $(option);
                    value.value.push(option.attr("value"));
                    value.sel.push(option.data("_sel"));
                });

                if(!target.prop("multiple")){
                    value.value = value.value[0];
                    value.sel = value.sel[0];
                }
            }
            else{
                value = target.val();

                if(attrs && !target.is("radio") && !target.is("checkbox")){
                    attrs.value = value;
                }
            }

            this._update(event, name, value, sel, attrs);

            if(validate.get(name)){
                validate.validate(name);
            }

            return false;
        },

        _update: function (event, name, value, sel, attrs) {

            var item = this.map[name];
            var index;

            if(attrs.type === "radio"){
                item.value = value;
                item.sel = sel;
            }
            else if(attrs.type === "checkbox"){
                index = $.inArray(value, item.value);
                if(index > -1){
                    item.value.splice(index, 1);
                    item.sel.splice(index, 1);
                }else{
                    item.value.push(value);
                    item.sel.push(sel);
                }
            }
            else if(sel.sel.indexOf("select") === 0){
                this.map[name] = value;
            }
            else{
                item.value = value;
            }

            if(sel.data.hooks && sel.data.hooks.model){
                sel.data.hooks.model.call(this.fragment.renderWidget, event, sel, value);
            }
        }

    };

    ////----

    var Validate = function(fragment){
        this.fragment = fragment;
        this.map = {};
    };

    Validate.prototype = {

        constructor: Validate,

        set: function(name, value){
            this.map[name] = value;
        },

        get: function(name){
            return this.map[name];
        },

        validate: function(name){

            if(name){
                return this._item(name);
            }
            else{
                return this._all();
            }

        },

        _item: function(name){

            var that = this;
            var item = this.map[name];
            var sel = item.sel;

            if(!sel && item._sel){
                this._setSel(name, item);
                sel = item.sel;
            }

            var value = this.fragment.instModel.get(name).value;
            var result = true;

            if($.isArray(sel)){
                $.each(sel, function (i, s) {
                    result = item["state"] = that._validate(s.node, item.data, value, s);
                });
            }
            else{
                result = item["state"] = this._validate(sel.node, item.data, value, sel);
            }

            return result;
        },

        _all: function(){

            var that = this;
            var result = true;
            var fragment = this.fragment;

            $.each(this.map, function (name, item) {
                var value = fragment.model(name);
                var sel = item.sel;

                if(!sel && item._sel){
                    that._setSel(name, item);
                    sel = item.sel;
                }

                if($.isArray(sel)){
                    $.each(sel, function (i, s) {
                        item["state"] = that._validate(s.node, item.data, value, s);
                    });
                }
                else{
                    item["state"] = that._validate(sel.node, item.data, value, sel);
                }

                if(!item["state"]){
                    result = false;
                }

            });

            return result;
        },

        _setSel: function(name, item){
            item.sel = [];
            this.fragment.element.find("[name='" + name + "']").each(function (i, element) {
                item.sel.push($(this).data("_sel"));
            });
        },

        _validate: function(target, data, value, sel){

            var that = this;
            var widget = this.fragment.renderWidget;
            var rule, validate, result = true;

            if($.isArray(data)){
                $.each(data, function (i, dat) {
                    result = that._validate(target, dat, value, sel);
                    if(!result){
                        return false;
                    }
                });
                return result;
            }
            else if($.isPlainObject(data)){

                rule = data.rule;

                if($.isFunction(rule)){
                    rule = rule.call(widget.element[0], value, target);
                }

                if($.type(rule) === "regexp"){
                    result = data.rule.test(value);
                }
                else if($.type(rule) === "string" && this.rules[rule]){
                    result = this.rules[rule].call(this, value, target);
                }
                else if($.isArray(rule) && this.rules[rule[0]]){
                    result = this.rules[rule[0]].call(this, value, target, rule[1]);
                }

                validate = sel.data.hooks && sel.data.hooks.validate;

                if(validate){
                    if(!!result){
                        validate.call(widget, sel, {valid: true, feedback: data.valid || ""});
                    }
                    else{
                        validate.call(widget, sel, {valid: false, feedback: data.invalid || ""});
                    }
                }

                return !!result;
            }
        },

        rules: {}
    };

    ////----

    $.widget("ui.fragment", {

        options: {
            render: null,
            data: {},
            widget: null
        },

        _create: function () {

            var hook;
            var that = this;

            this.render = this.options.render;
            this.renderData = this.options.data;
            this.renderWidget = this.options.widget;
            this.dom = dom;
            this.instModel = new Model(this);
            this.instValidate = new Validate(this);

            //--

            this._createSel();
            this._checkElement();
            this._patch();

            if(
                this.sel &&
                (hook = this.sel.data.hooks) &&
                (hook = hook.mounted)
            ){
                hook.call(this.renderWidget || this, this.sel);
            }

            //--

            if(!$.isEmptyObject(this.instModel.map)){
                this.instModel.init();
            }

            //--

            $.each(this._createHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _createSel: function () {
            var result = this.render(this.renderData, this.renderWidget);
            var sel = new Sel(result, this);
            this.sel = !sel.remove ? sel : null;
        },

        _checkElement: function(update){
            var match, pSel;

            if(this.sel){

                match = selReg.exec(this.sel.sel);

                if(!this.element.is(match[1])){
                    $.error("Original tag is different from the replace tag '" + match[1] + "'.");
                }

                if(update){
                    if(pSel = this.element.data("_sel")){
                        this._mergeSel(this.sel, pSel, update);
                    }
                }
                else{
                    if(pSel = this.element.data("_sel")){
                        return this._mergeSel(this.sel, pSel);
                    }
                    else{
                        this.element.attr({
                            id: match[2],
                            class: match[3] && match[3].split(".").join(" ")
                        });
                    }
                }
            }
        },

        _mergeSel: function(target, copy, update){

            var mt = selReg.exec(target.sel);
            var mc = selReg.exec(copy.sel);
            var id = mt[2] || mc[2];
            var classes;

            if(mc[3]){
                classes = mc[3].split(".");
            }

            if(mt[3]){
                classes = (classes || []).concat(mt[3].split("."));
            }

            target.sel = mt[1];

            if(id){
                target.sel += "#" + id;
                this.element[0]["id"] = id;
            }

            if(classes){
                classes = this._unique(classes);
                target.sel += "." + classes.join(".");
                this.element[0]["className"] = classes.join(" ");
            }

            target.data.style = $.extend({}, copy.data.style, target.data.style);
            target.data.classes = $.extend({}, copy.data.classes, target.data.classes);
        },

        _unique: function(arr){
            var hash = [];
            var leng = arr.length;
            var i;
            for (i = 0; i < leng; i++) {
                if(hash.indexOf(arr[i]) === -1){
                    hash.push(arr[i]);
                }
            }
            return hash;
        },

        _patch: function () {
            this.dom.patch(this.oldSel || this.element[0], this.sel);
            this.oldSel = this.sel;
        },

        validate: function(name){
            if(name){
                return this.instValidate.validate(name);
            }
            return this.instValidate.validate();
        },

        rule: function(key, value){

            if(typeof key === "string"){
                key = {[key]: value};
            }

            $.extend(Validate.prototype.rules, key);
        },

        model: function(name, hasSel){
            
            var ret, result;
            
            if(typeof name === "boolean"){
                hasSel = name;
                name = undefined;
            }
            
            if(name){
                ret = this.instModel.get(name);
                return hasSel ? ret : ret.value;
            }
            else{
                ret = this.instModel.get();
                if(hasSel){
                    return ret;
                }
                else{
                    result = {};
                    $.each(ret, function (name, item) {
                        result[name] = item.value;
                    });
                    return result;
                }
            }
        },

        data: function(){
            return this.renderData;
        },

        update: function (data) {
            var that = this;

            if($.isFunction(data)){
                data(this.renderData);
            }
            else if(data){
                this.renderData = $.widget.extend(this.renderData, data);
            }

            clearTimeout(this.timeout);

            this.timeout = this._delay(function () {
                this._createSel();
                this._checkElement(true);
                this._patch();
            });

            //--

            $.each(this._updateHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _destroy: function(){
            var that = this;
            $.each(this._destroyHooks, function (key, fn) {
                fn.call(that);
            });
        },

        _createHooks: {},
        _updateHooks: {},
        _destroyHooks: {}
    });

    ////----扩展$(selector).ready();

    if(!$.fn.selector){

        $.fn.init = (function (orig) {

            return function (selector, context, root) {
                var inst = orig.call(this, selector, context, root);
                inst.selector = selector;
                return inst;
            }

        })($.fn.init);

        $.fn.init.prototype = $.fn;
    }

    $.fn.ready = (function (orig) {

        return function (fn) {
            var that = this;

            if(this[0] === document){
                return orig.call(this, fn);
            }
            else{
                if(this.length){
                    fn.call(this[0], $);
                }
                else{
                    $.Deferred(function (dfd) {
                        var element;
                        var time = 3000;
                        var interval = setInterval(function () {
                            element = $(that.selector);
                            if(element.length){
                                clearInterval(interval);
                                dfd.resolveWith(element[0], $);
                            }
                            else{
                                time -= 50;
                                if(time < 1){
                                    clearInterval(interval);
                                }
                            }
                        }, 50);
                    }).done(fn);
                }
                return this;
            }
        }

    })($.fn.ready);

    ////----$.fn.fragment
    ////----$.wdgt,$.slot,$.hook

    $.fn.fragment = (function(orig){

        return function (render, data, widget) {

            var args = [].slice.call(arguments, 0);
            var returnValue = this;

            this.each(function () {

                var element = $(this);
                var methodValue;

                if(typeof render === "string"){

                    methodValue = orig.apply(element, args);

                    if (methodValue && (!methodValue.jquery || methodValue[0] !== this)) {
                        returnValue = methodValue;
                        return false;
                    }
                }
                else if($.isFunction(render)){

                    try{
                        orig.call(element, "destroy");
                    }
                    catch (e) {

                    }

                    orig.call(element, {
                        render: render,
                        data: data,
                        widget: widget
                    });
                }
                else if($.isPlainObject(render)){
                    orig.call(element, render);
                }
                else{
                    $.error("The parameter 'render' of method 'fragment' is incorrect.");
                }
            });

            return returnValue;
        }
    })($.fn.fragment);

    $.extend({

        slot: function(hook, sel){

            if($.isFunction(hook)){
                hook = hook.call(this.element, sel.node);
            }

            if(
                typeof hook === "string"
                || (hook != null && typeof hook === "object" && hook.nodeType)
            ){
                $(sel.node).append(hook);
            }
        },

        wdgt: function(name, options, sel){

            if(typeof name !== "string" || !$.fn[name]){
                $.error("Widget name does not exist.");
            }

            if(options && options.isSel){
                sel = options;
                options = undefined;
            }

            $(sel.node)[name](options);
        },

        hook: function (element, hook, fn, keep) {

            $(element).each(function (i, elem) {
                var sel = $(elem).data("_sel") || $(elem).data("ui-fragment").sel;

                sel.data.hooks = sel.data.hooks || {};
                sel.data.hooks["_" + hook] = function (sel, selOld) {
                    fn(sel, selOld, i, elem);
                };
                sel.data.hooks["_" + hook]["keep"] = keep;
            });
        }

    });

    ////----widget方法
    ////----_fragment
    ////----_wdgt,_slot,_hook

    $.extend($.Widget.prototype, {

        _fragment: function (element, render, data) {

            if(element.nodeType){
                element = $(element);
            }

            if(!element.jquery){
                return this._fragment(this.element, element, render, data);
            }

            if(typeof render === "string"){
                return element.fragment.apply(element, [].slice.call( arguments, 1 ))
            }
            else if(typeof render === "function"){

                try{
                    element.fragment("destroy");
                }
                catch (e) {

                }

                element.fragment({
                    render: render,
                    data: data || this.options,
                    widget: this
                });
            }
            else{
                $.error("The parameter 'render' of method '_fragment' is incorrect.");
            }
        },

        _slot: function(hook, sel){
            $.slot(hook, sel);
        },

        _wdgt: function (name, options, sel) {
            $.wdgt(name, options, sel);
        },

        _hook: function (element, hook, fn, keep) {

            if(typeof fn === "undefined" || typeof fn === "boolean"){
                fn = hook;
                hook = element;
                element = this.element;
            }

            $.hook(element, hook, fn, keep);
        }
    });

});
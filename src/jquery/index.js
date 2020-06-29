import $ from "jquery";

$.widgetUuid = 0;
$.widgetSlice = Array.prototype.slice;

$.cleanData = ( function( orig ) {
    return function( elems ) {
        var events, elem, i;
        for ( i = 0; ( elem = elems[ i ] ) != null; i++ ) {
            try {
                events = $._data( elem, "events" );
                if ( events && events.remove ) {
                    $( elem ).triggerHandler( "remove" );
                }
            } catch ( e ) {}
        }
        orig( elems );
    };
} )( $.cleanData );

$.widgetExtend = function( target ) {
    var input = $.widgetSlice.call( arguments, 1 );
    var inputIndex = 0;
    var inputLength = input.length;
    var key;
    var value;

    for ( ; inputIndex < inputLength; inputIndex++ ) {
        for ( key in input[ inputIndex ] ) {
            value = input[ inputIndex ][ key ];
            if ( input[ inputIndex ].hasOwnProperty( key ) && value !== undefined ) {
                if ( $.isPlainObject( value ) ) {
                    target[ key ] = $.isPlainObject( target[ key ] ) ?
                        $.widgetExtend( {}, target[ key ], value ) :
                        $.widgetExtend( {}, value );
                } else {
                    target[ key ] = value;
                }
            }
        }
    }
    return target;
};

$.createRenderRoot = function(vnode, isMain){
    var root = isMain ? "this" : "div";

    if(vnode == null || typeof vnode === "boolean"){
        return null;
    }
    else if($.isArray(vnode)){
        if(typeof vnode[0] === "string"){
            if (isMain && !/^this[#\.\[]*/.test(vnode[0])) {
                vnode = [root, vnode];
            }
            return vnode;
        }
        return [root, vnode];
    }
    else{
        return [root, String(vnode)];
    }
};

export default $;
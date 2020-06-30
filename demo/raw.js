import $ from 'jquery';
import render from '@/index';


render('#app', {

    options: {
        title: 'this is header'
    },

    renders: {
        main(){
            return ['this',
                ['render[name=header]'],
                ['div', 'this is a div']
            ];
        },
        header(o){
            return [
                ['header', {
                    onclick(e, raw){
                        raw.update({title: 'this is header' + Date.now()});
                    }
                }, o.title]
            ];
        }
    }
});

/*
// demo 1
render('#app', {

    options: {
        title: 'this is header'
    },

    renders: {
        main(){
            return ['this',
                ['render[name=header]'],
                ['div', 'this is a div']
            ];
        },
        header(o){
            return ['header', {
                onclick(e, raw){
                    raw.update({title: 'this is header' + Date.now()});
                }
            }, o.title];
        }
    }
});
*/

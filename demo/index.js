import $ from 'jquery';
import render from '@/index';


/*
// demo 6 event
render('#app', {
    options: {
        text: 'click me',
        remove: false
    },
    renders: {
        main(o){
            return !o.remove && ['this', {
                oncreate(raw){
                    console.log(raw, 'widget is created');
                },
                onupdate(raw, oldRaw){
                    console.log(raw, oldRaw, 'widget will be update')
                },
                ondestroy(raw, rm){
                    console.log(raw, 'widget will be destory');
                    rm();
                },
                onclick(e, raw){
                    // this._update({text: 'click this'});
                    this._update({remove: true});
                }
            }, o.text]
        }
    }
});
*/

/*
// demo 5 array
render('#app', {
    renders: {
        main(){
            // return ['this', 'hello world'];
            // return ['div', 'hello world'];
            /!*
            return ['this', [
                ['p', 'this is a p'],
                ['div', 'this is a div']
            ]];
            *!/
            /!*
            return ['this',
                ['p', 'this is a p'],
                ['div', 'this is a div']
            ];
            *!/
            /!*
            return [
                ['p', 'this is a p'],
                '666',
                ['div', 'this is a div']
            ];
            *!/
            /!*
            return [
                ['p', 'this is a p'],
                '666',
                [
                    ['div', 'this is a div'],
                    999,
                    ['p', 'this is an other p']
                ]

            ];
            *!/
        }
    }
});
*/

/*
// demo 4 not array
render('#app', {
    renders: {
        main(){
            // return 'hello world';
            // return 666;
            return {
                a: 'aaa',
                b: 'bbb'
            }
        }
    }
});
*/

/*
// demo 3 remove node
render('#app', {
    renders: {
        main(){
            // return;
            // return undefined;
            // return null;
            // return false;
            return true;
        }
    }
});
*/

/*
// demo 2
render('#app', {
    renders: {
        main(){
            return ['this', 'this renders is an object.']
        }
    }
});
*/

/*
// demo 1
render('#app', {
    renders(){
        return ['this', 'this renders is a function.']
    }
});
*/

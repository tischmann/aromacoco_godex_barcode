'use strict'

const JSPM_HOST = 'localhost';

const JSPM_PORT = 27443;

const LANGUAGE = 'ru';

const DPI_300 = false; // 300 dpi, else 200 dpi

const MULTIPLIER = DPI_300 ? 12 : 8;

const DEBUG = false;

const labelPrinter = (function () {
    const sequence = new Map();
    const lang = {
        ru: {
            empty: 'ЗДЕСЬ НИЧЕГО НЕТ',
            sequence: 'ОЧЕРЕДЬ',
            clear: 'ОЧИСТИТЬ',
            print: 'ПЕЧАТЬ'
        },
        en: {
            empty: 'EMPTY',
            sequence: 'SEQUENCE',
            clear: 'CLEAR',
            print: 'PRINT'
        }
    };
    const fn = {};
    const sequenceWrapper = document.createElement('div');
    const sequenceItemsWrapper = document.createElement('div');

    function jspmWSStatus() {
        if (JSPM.JSPrintManager.websocket_status == JSPM.WSStatus.Open)
            return true;
        else if (JSPM.JSPrintManager.websocket_status == JSPM.WSStatus.Closed) {
            alert('JSPrintManager (JSPM) is not installed or not running! Download JSPM Client App from https://neodynamic.com/downloads/jspm');
            return false;
        }
        else if (JSPM.JSPrintManager.websocket_status == JSPM.WSStatus.Blocked) {
            alert('JSPM has blocked this website!');
            return false;
        }
    }

    fn.init = function () {
        JSPM.JSPrintManager.auto_reconnect = true;
        JSPM.JSPrintManager.start(true, JSPM_HOST, JSPM_PORT);

        const categoriesWrapper = document.createElement('div');
        categoriesWrapper.classList.add('categories-wrapper');
        document.body.append(categoriesWrapper);

        for (const key in content.categories) {
            const itemsWrapperPromise = new Promise((resolve, reject) => {
                const itemsWrapper = document.createElement('div');
                itemsWrapper.classList.add(
                    'items-wrapper',
                    `items-wrapper-${content.categories[key].type}`,
                    'hidden'
                );
                itemsWrapper.setAttribute('data-type', content.categories[key].type);
                itemsWrapper.innerHTML = lang[LANGUAGE].empty;

                const category = document.createElement('div');
                category.classList.add(
                    'category',
                    `category-${content.categories[key].type}`
                );
                category.setAttribute('data-type', content.categories[key].type);
                category.innerHTML = `${content.categories[key].title}:${content.categories[key].data.length}`;
                category.addEventListener('click', categoryClickHandler);
                category.addEventListener('touchstart', categoryClickHandler);
                categoriesWrapper.append(category);

                if (content.categories[key].data.length) {
					itemsWrapper.style.height = 'auto';
                    itemsWrapper.style.removeProperty('height');
                    itemsWrapper.innerHTML = '';
                }

                for (const itemKey in content.categories[key].data) {
                    const itemPromise = new Promise((resolve, reject) => {
                        const item = document.createElement('div');
                        item.classList.add('item');
                        item.dataset.title = content.categories[key].data[itemKey].title;
                        item.dataset.code = content.categories[key].data[itemKey].code;
                        item.dataset.barcode = content.categories[key].data[itemKey].barcode;
                        item.innerHTML = content.categories[key].data[itemKey].title;
                        item.addEventListener('click', itemClickHandler);
                        //item.addEventListener('touchstart', itemClickHandler);
                        resolve(item);
                    });

                    itemPromise.then(element => itemsWrapper.append(element));
                }

                if (content.categories[key].default) {
                    category.classList.add('selected');
                    itemsWrapper.classList.remove('hidden');
                }

                resolve(itemsWrapper);
            });

            itemsWrapperPromise.then(element => document.body.append(element));
        }


        sequenceWrapper.classList.add('category', 'sequence-wrapper');
        sequenceWrapper.innerHTML = `${lang[LANGUAGE].sequence}:0`;
        sequenceWrapper.setAttribute('data-type', 'sequence');
        sequenceWrapper.addEventListener('click', categoryClickHandler);
        sequenceWrapper.addEventListener('touchstart', categoryClickHandler);
        categoriesWrapper.append(sequenceWrapper);

        sequenceItemsWrapper.classList.add(
            'items-wrapper',
            `items-wrapper-sequence`,
            'hidden'
        );
        sequenceItemsWrapper.setAttribute('data-type', 'sequence');
        document.body.append(sequenceItemsWrapper);
    }

    function categoryClickHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        document.body.querySelectorAll('.category.selected').forEach(element => {
            element.classList.remove('selected');
        });

        document.body.querySelectorAll('.items-wrapper').forEach(element => {
            if (this.dataset.type == element.dataset.type) {
                element.classList.remove('hidden');
                document.body.style.backgroundColor = getComputedStyle(element)['background-color'];
            } else {
                element.classList.add('hidden');
            }
        });

        this.classList.add('selected');

        if (this.dataset.type == 'sequence') {
            renderSequence();
        }
    }

    function itemClickHandler(event) {
        event.preventDefault();
        event.stopPropagation();
        addToSequence({title:this.dataset.title, code:this.dataset.code, barcode:this.dataset.barcode, count:1});
    }

    function countSequenceItems() {
        let total = 0;

        for (const value of sequence.values()) {
            total += value.count;
        }

        sequenceWrapper.innerHTML = `${lang[LANGUAGE].sequence}:${total}`;

        if (!sequence.size) {
            sequenceItemsWrapper.innerHTML = lang[LANGUAGE].empty;
            sequenceItemsWrapper.style.height = sequenceItemsWrapper.dataset.height;
        }
    }

    function isBarcodeInSequence(code) {
        for (const [obj, value] of sequence.entries()) {
            if (value.code == code) return true;
        }

        return false;
    }

    function addToSequence({title = 'EMPTY', code = 'EMPTY', barcode = '0000000000000', count  = 1 }) {
        let obj = {
            title: title,
            code: code,
            barcode: barcode,
            count: 1
        }

        if (isBarcodeInSequence(code)) {
            obj = sequence.get(code)
            obj.count++;
        }

        sequence.set(code, obj);

        countSequenceItems()
    }

    function renderSequence() {
        sequenceItemsWrapper.innerHTML = lang[LANGUAGE].empty;

        if (sequence.size) {
            sequenceItemsWrapper.setAttribute('data-height', sequenceItemsWrapper.style.height);
            sequenceItemsWrapper.innerHTML = '';
            sequenceItemsWrapper.style.removeProperty('height');

            const clear = document.createElement('div');
            clear.classList.add('item', 'clear');
            clear.innerHTML = lang[LANGUAGE].clear;
            clear.addEventListener('click', clearSequenceHandler);
            clear.addEventListener('touchstart', clearSequenceHandler);
            sequenceItemsWrapper.append(clear);

            const print = document.createElement('div');
            print.classList.add('item', 'print');
            print.addEventListener('click', printSequenceHandler);
            print.addEventListener('touchstart', printSequenceHandler);
            print.innerHTML = lang[LANGUAGE].print;
            sequenceItemsWrapper.append(print);
        }

        for (var [key, value] of sequence) {
            const sqeuenceItemPromise = new Promise((resolve, reject) => {
                const sequenceItem = document.createElement('div');
                sequenceItem.classList.add('item');

                const deleteButton = document.createElement('div');
                deleteButton.classList.add('delete');
                deleteButton.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512.001 512.001" xml:space="preserve">
            <path d="M294.111,256.001L504.109,46.003c10.523-10.524,10.523-27.586,0-38.109c-10.524-10.524-27.587-10.524-38.11,0L256,217.892
            L46.002,7.894c-10.524-10.524-27.586-10.524-38.109,0s-10.524,27.586,0,38.109l209.998,209.998L7.893,465.999
            c-10.524,10.524-10.524,27.586,0,38.109c10.524,10.524,27.586,10.523,38.109,0L256,294.11l209.997,209.998
            c10.524,10.524,27.587,10.523,38.11,0c10.523-10.524,10.523-27.586,0-38.109L294.111,256.001z"/>
        </svg>`;
                deleteButton.addEventListener('click', deleteSequenceItem);
                deleteButton.addEventListener('touchstart', deleteSequenceItem);
                deleteButton.setAttribute('data-code', value.code);
                sequenceItem.append(deleteButton);

                const title = document.createElement('div');
                title.innerHTML = value.title;
                sequenceItem.append(title);

                const minus = document.createElement('div');
                minus.classList.add('minus');
                minus.innerHTML = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"viewBox="0 0 409.6 409.6" xml:space="preserve"><path d="M392.533,187.733H17.067C7.641,187.733,0,195.374,0,204.8s7.641,17.067,17.067,17.067h375.467 c9.426,0,17.067-7.641,17.067-17.067S401.959,187.733,392.533,187.733z"/></svg>`;
                minus.addEventListener('click', minusItemHandler);
                minus.addEventListener('touchstart', minusItemHandler);
                minus.setAttribute('data-code', value.code);
                sequenceItem.append(minus);

                const count = document.createElement('div');
                count.innerHTML = value.count;
                count.classList.add('count');
                sequenceItem.append(count);

                const plus = document.createElement('div');
                plus.classList.add('plus');
                plus.innerHTML = `<svg viewBox="0 0 426.66667 426.66667" xmlns="http://www.w3.org/2000/svg"><path d="m405.332031 192h-170.664062v-170.667969c0-11.773437-9.558594-21.332031-21.335938-21.332031-11.773437 0-21.332031 9.558594-21.332031 21.332031v170.667969h-170.667969c-11.773437 0-21.332031 9.558594-21.332031 21.332031 0 11.777344 9.558594 21.335938 21.332031 21.335938h170.667969v170.664062c0 11.777344 9.558594 21.335938 21.332031 21.335938 11.777344 0 21.335938-9.558594 21.335938-21.335938v-170.664062h170.664062c11.777344 0 21.335938-9.558594 21.335938-21.335938 0-11.773437-9.558594-21.332031-21.335938-21.332031zm0 0"/></svg>`;
                plus.addEventListener('click', plusItemHandler);
                plus.addEventListener('touchstart', plusItemHandler);
                plus.setAttribute('data-code', value.code);
                sequenceItem.append(plus);
                resolve(sequenceItem);
            });

            sqeuenceItemPromise.then(element => {
                sequenceItemsWrapper.prepend(element);
            });
        }
    }

    function clearSequenceHandler(event) {
        event.preventDefault();
        event.stopPropagation();
        sequence.clear();
        countSequenceItems();
        renderSequence();
    }

    function printSequenceHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!jspmWSStatus()) return false;

        const cpj = new JSPM.ClientPrintJob();

        cpj.clientPrinter = new JSPM.DefaultPrinter();

        const CR = "\x0D";

        let commands = '';

        const wrap = function (text, width = 13) {
            return text.replace(
                new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, 'g'), '$1\n'
            ).split('\n');
        }

        const margin = function (text) {
            return 16 + ((13 - text.length) * 8);
        }

        for (const [key, value] of sequence.entries()) {
            const length = value.code.length;

            if (value.barcode.length != 13) {
                alert('Bad barcode (length must be 13): ' + value.barcode);
                return false;
            }

            if (!length) {
                alert(`empty code`)
                return false;
            }

            else if (length > 13) {
                alert('Too much symbols (max length is 13): ' + value.code.length);
                return false;
            }

            let top = Math.round(1.5 * MULTIPLIER);

            const BARCODE = DPI_300 
            ? `BE,22,90,3,6,32,0,1,${value.barcode}${CR}`
            : `BE,12,49,2,6,32,0,1,${value.barcode}${CR}`;

            const TEXT = DPI_300
            ? `AJ,${margin(value.code)},${top},2,2,0,0,${value.code}${CR}`
            : `AI,${margin(value.code)},${top},1,1,0,0,${value.code}${CR}`;

            commands += `^Q15,3${CR}`
                + `^W30${CR}`
                + `^H19${CR}` // Brightness - 1...19
                + `^P1${CR}`
                + `^S4${CR}`
                + `^AT${CR}` // Print type: AT - termo transfer, AD - direct
                + `^C1${CR}`
                + `^R0${CR}`
                + `~Q+0${CR}`
                + `^O0${CR}`
                + `^D0${CR}`
                + `^E18${CR}`
                + `~R255${CR}`
                + `^L${CR}`
                + `Dy2-me-dd${CR}`
                + `Th:m:s${CR}`
                + BARCODE
                + TEXT
                + `E${CR}`;
        }

        if (DEBUG) console.log(commands);

        cpj.printerCommands = commands;
        cpj.sendToClient();
        sequence.clear();
        countSequenceItems();
        renderSequence();
    }

    function minusItemHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        const code = this.dataset.code
     
        let obj = sequence.get(code)

        obj.count--;

        if (obj.count == 0) {
            sequence.delete(code);
            this.parentNode.remove();
            countSequenceItems();
            return false;
        } else {
            sequence.set(code, obj);
        }

        this.parentNode.querySelectorAll('.count').forEach(element => {
            element.innerHTML = obj.count;
        });

        countSequenceItems();
    }

    function plusItemHandler(event) {
        event.preventDefault();
        event.stopPropagation();

        const code = this.dataset.code

        let obj = sequence.get(code)

        obj.count++;

        sequence.set(code, obj);

        this.parentNode.querySelectorAll('.count').forEach(element => {
            element.innerHTML = obj.count;
        });

        countSequenceItems();
    }

    function deleteSequenceItem(event) {
        event.preventDefault();
        event.stopPropagation();
        sequence.delete(this.dataset.key);
        this.parentNode.remove();
        countSequenceItems();
    }

    return fn;
})();

labelPrinter.init();

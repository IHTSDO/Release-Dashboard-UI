export class Sort {

    private sortOrder = 1;
    private collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
    });


    constructor() {
    }

    public startSort(property, order, type = '') {
        if (order === 'desc') {
            this.sortOrder = -1;
        }
        return (a, b) => {
            if (type === 'date') {
                return this.sortData(new Date(a[property]), new Date(b[property]));
            } else {
                return this.collator.compare(a[property] && isNaN(a[property]) ? a[property].trim() : a[property],
                                                b[property] && isNaN(b[property]) ? b[property].trim() : b[property]) * this.sortOrder;
            }
        };
    }

    private sortData(a, b) {
        if (a < b) {
            return -1 * this.sortOrder;
        } else if (a > b) {
            return 1 * this.sortOrder;
        } else {
            return 0 * this.sortOrder;
        }
    }
}

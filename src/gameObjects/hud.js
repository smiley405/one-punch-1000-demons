import { GameObject } from "../gameObject";

export function HUD(_root, container, options) {
    var e = new GameObject(_root, container).init();
    var height = options.height || 5;
    var width = options.width || 100;
    var bgColor = options.bgColor || "#ff0052";
    var fgColor = options.fgColor || "#00ff43";

    return Object.assign(e, {
        init: function() {
            this.totalAmount = 10;
            this.bgHealthBar = this.g.rectangle(width, height, bgColor, "", 0, 0, 0);
            this.fgHealthBar = this.g.rectangle(width, height, fgColor, "", 0, 0, 0);
            this.healthBarContainer = this.g.group(this.bgHealthBar, this.fgHealthBar);
            this.healthBarContainer.x = options.x || 0;
            this.healthBarContainer.y = options.y || 0;
            this.healthBarContainer.alpha = 0.5;
            this.container.addChild(this.healthBarContainer);
            return this;
        },

        updateBar: function(amount) {
            this.fgHealthBar.width = amount/this.totalAmount * width;
        }
    });
} 

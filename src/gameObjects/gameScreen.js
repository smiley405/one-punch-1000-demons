import { FLIP_H_SIDE, PLAYER_POWER_PUNCHES_TYPE } from "../const";
import { GameObject } from "../gameObject";

export function GameScreen(_root, container) {
    var e = new GameObject(_root, container).init();

    return Object.assign(e, {
        init: function() {
            this.timeouts.startPowerAttackScreen = null;
            this.timeouts.endPowerAttackScreen = null;
            this.powerAttackScreen = this.g.rectangle(this._root.config.width, this._root.config.height, "white", "", 0, 0, 0);
            this.container.addChild(this.powerAttackScreen);
            this.powerAttackScreen.visible = false;
            return this;
        },

        showPowerAttackScreen: function(powerType, options) {
            options = options || {};
            if (this.timeouts.startPowerAttackScreen) {
                return;
            }
            this.timeouts.startPowerAttackScreen = setTimeout(function() {
                this.startPowerAttackScreen(powerType, options);
            }.bind(this),300);
            this.timeouts.endPowerAttackScreen = setTimeout(function() {
                this.endPowerAttackScreen();
            }.bind(this),500);
        },

        setPowerAttackScreenProps: function(props) {
            this.powerAttackScreen.width = props.width;
            this.powerAttackScreen.height = props.height;
            this.powerAttackScreen.x = props.x;
            this.powerAttackScreen.y = props.y; 
            this.powerAttackScreen.scaleX = props.scaleX;
        },

        startPowerAttackScreen: function(powerType, options) {
            options = options || {};
            this.powerAttackScreen.visible = true;
            var width = this._root.config.width;
            var height = this._root.config.height;
            var x = 0;
            var y = 0;
            var flipH = options.flipH || FLIP_H_SIDE.RIGHT.value;

            switch(powerType) {
                case PLAYER_POWER_PUNCHES_TYPE.TELEPORT:
                    this.setPowerAttackScreenProps({
                        width: options.width || width,
                        height: options.height || height,
                        x: flipH === FLIP_H_SIDE.RIGHT.value ? options.x : options.x - options.width,
                        y: options.y || y  
                    });
                    break;
                default:
                    this.setPowerAttackScreenProps({
                        width,
                        height,
                        x,
                        y,
                        scaleX: 1
                    });
            }
        },

        endPowerAttackScreen: function() {
            this.powerAttackScreen.visible = false;
            this.killTimeout("startPowerAttackScreen");
            this.killTimeout("endPowerAttackScreen");
        }

    });
    
}

export function GameObject(_root, container) {
    return Object.assign(this, {
        init: function() {
            this._root = _root;
            this.g = _root.g;
            this.container = container || _root.gameContainer;
            this.config = null;
            this.states = null;
            this.playState = null;
            this.hitAreaWatchList = [];
            this._updateIndex = undefined;
            this.timeouts = {};
            return this;
        },
        startUpdate: function() {
            var update = this.update.bind(this);
            this._updateIndex = this.g.updateFunctions.length;
            this.g.updateFunctions.push(update);
        },

        stopUpdate: function() {
            if (this._updateIndex !== undefined) {
                this.g.updateFunctions[this._updateIndex] = null;
                this._updateIndex = undefined;
            }
        },

        addToHitAreaWatchList: function(sprites) {
            sprites.forEach(function(sprite) {
                this.hitAreaWatchList.push(sprite);
            }.bind(this));
        },

        getFrames: function(sprite, name) {
            return this.g.getFrames(sprite, name);
        },

        getArrayRandomValue: function(array) {
            return array[ this.g.randomInt(0, array.length-1) ];
        },

        createSprite: function(name) {
            return this.g.sprite(this.g.getSmartSprite(name));
        },

        playAnimation: function(sprite, name) {
            if (this.playState !== name && !sprite.playing) {
                sprite.fps = this.states[name].fps;
                sprite.loop = this.states[name].loop;
                sprite.playSequence(this.states[name].frames);
                this.playState = name;
            }
        },

        /**
         * 
         * @param {object} states - object of { name: {frames: number[] | number, fps: number, loop: boolean} } 
         */
        setAnimatonStates: function(states) {
            states = states || {};
            this.states = states;
        },

        killTimeout: function(timeoutName) {
            if (this.timeouts[timeoutName]) {
                clearTimeout(this.timeouts[timeoutName]);
                this.timeouts[timeoutName] = null;
            }
        },

        updateWatchList: function() {
            this.hitAreaWatchList.forEach(function(sprite) {
                sprite.visible = this._root.config.debug;
                sprite.alpha = this._root.config.debug ? 0.5 : sprite.alpha;
            }.bind(this));
        },

        update: function(isSyncWithGameOver) {
            if (isSyncWithGameOver && this._root.isGameOver) {
                this.stopUpdate();
            } else {
                this.updateWatchList();
            }
        }

    });
}

// "use strict";
/* The Block object */
/* States */
const STATIC = 0;
const HANG = 1
const FALL = 2
const SWAP = 3
const CLEAR = 4
/* Animation states */
const ANIM_SWAP_LEFT = 0;
const ANIM_SWAP_RIGHT = 1;
const ANIM_LAND = 2;
const ANIM_CLEAR_BLINK = 3;
const ANIM_CLEAR_FACE = 4;
const ANIM_CLEAR_DEAD = 5;

/* Timing */
const HANGTIME = 11;
const FALLTIME = 4;
const SWAPTIME = 4;
const CLEARBLINKTIME = 38;
const CLEARPAUSETIME = 20;
const CLEAREXPLODETIME = 8;
const PUSHTIME = 1000;
/* Animation timing */
const ANIM_SWAPTIME = 4;
const ANIM_LANDTIME = 4;
const ANIM_CLEARBLINKTIME = 38;
const ANIM_CLEARFACETIME = 20
const ANIM_DANGERTIME = 6;

/* The block object.
 * Represents a block in the grid. An empty spot in the grid (visually) is
 * still represented by a block. This way each block can always ask its
 * neighbors for information.
 */
function Block() {
    this.game = null;
    this.x = null;
    this.y = null;
    this.state = null;
    this.above = null;
    this.under = null;
    this.left = null;
    this.right = null;
    this.counter = 0;
    this.animation_state = null;
    this.animation_counter = 0;
    this.explode_counter = 0;
    this.chain = null;
    this.sprite = null;
    this.garbage = null;

    /* Initialise this block.
     *
     * game is the TaGame object this block belongs to.
     * x and y are its coordinates in the grid
     */
    this.init = function(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.state = STATIC;
        this.chain = false;
    }

    /* Initialise this block as a wall.
     * A wall block will see itself as its neighbors.
     * It is never supposed to have a sprite and should always have a state
     * of STATIC.
     * The wall is used on the outer edges of the grid.
     *
     * game is the TaGame object this block belongs to.
     */
    this.initWall = function(game) {
        this.game = game;
        this.x = null;
        this.y = null;
        this.under = this;
        this.above = this;
        this.left = this;
        this.right = this;
        this.state = STATIC;
        this.counter = 0;
        this.animation_state = null;
        this.animation_counter = 0;
        this.sprite = null;
    }

    /* Whether this block can be swapped or not.
     * Blocks can be swapped as long as no counter is running.
     * Blocks cannot be swapped underneath a block about to fall from hang
     *
     * returns a boolean
     */
    this.isSwappable = function() {
        if (this.above.state == HANG)
            return false;
        return this.counter == 0;
    }

    /* Whether this block is empty or not.
     * returns a boolean
     */
    this.isEmpty = function() {
        return this.counter == 0
            && this.sprite == null
            && this != this.game.wall;
    }

    /* Whether this block will stop other blocks from falling.
     * returns a boolean
     */
    this.isSupport = function() {
        return this.state != FALL
            && (this.sprite != null
                    || this.game.wall == this);
    }

    /* Whether this block can currently becombo cleared. It should not be busy and
     * should be supported.
     * returns a boolean
     */
    this.isClearable = function() {
        return this.isSwappable()
            && this.under.isSupport()
            && this.sprite != null;
    }

    /* Make this block a new block.
     * Adds a sprite to the block, and animations to the sprite. Will
     * overwrite any sprite already present.
     *
     * optional sprite_nr is an int indicating which sprite should be used.
     * If none is specified, a random sprite will be picked.
     */
    this.newBlock = function(sprite_nr) {
        if (sprite_nr === undefined) {
            // No block number given, so generate random block
            sprite_nr = (Math.floor(Math.random() * GLOBAL.nrBlockSprites)) + 1;
        }
        this.sprite = sprite_nr
    }

    /* Update the current state of this block based on its own state, and the
     * states of its neighbors.
     * Will keep its current state it its counter is still running.
     * Block behaviour should be described in the wiki
     */
    this.updateState = function() {
        /* If the block has a counter, decrement it, return if it is not done*/
        if (this.animation_counter > 0)
            this.animation_counter--;
        if (this.animation_counter <= 0) {
            if (this.animation_state == ANIM_CLEAR_BLINK) {
                this.animation_state = ANIM_CLEAR_FACE;
                this.animation_counter = ANIM_CLEARFACETIME;
            } else if (this.explode_counter > 0) {
                this.explode_counter--;
                if (this.explode_counter == 0)
                    this.animation_state = ANIM_CLEAR_DEAD;
            } else if (this.animation_state == ANIM_CLEAR_DEAD) {
            } else
                this.animation_state = null;
        }
        if (this.counter > 0) {
            this.counter--;
            if (this.counter > 0)
                return;
        }

        /* Run through the state switch to determine behaviour */
        switch (this.state) {
            case STATIC:
            case SWAP:
                if (!this.sprite) {
                    this.state = STATIC;
                    this.chain = false;
                    return;
                }
                else if (this.under == this.game.wall) {
                    this.state = STATIC;
                    this.chain = false;
                }
                else if (this.under.state == HANG) {
                    this.state = HANG;
                    this.counter = this.under.counter;
                    this.chain = this.under.chain;
                }
                else if (this.under.isEmpty()) {
                    this.state = HANG;
                    this.counter = HANGTIME;
                }
                else {
                    this.chain = false;
                }
                break;
            case HANG:
                this.state = FALL;
            case FALL:
                if (this.under.isEmpty()) {
                    this.fall();
                }
                else if (this.under.state == CLEAR) {
                    this.state = STATIC;
                }
                else {
                    this.state = this.under.state;
                    this.counter = this.under.counter;
                    if (this.under.chain) {
                        this.chain = true;
                    }
                }
                if ((this.state == STATIC || this.state == SWAP) && this.sprite) {
                    this.animation_state = ANIM_LAND;
                    this.animation_counter = BLOCKS.animations.land.length;
                    //this.sprite.animations.play('land', GLOBAL.game.time.desiredFps, false);
                }
                break;
            case CLEAR:
                this.erase();
                break;
            default:
                console.log("Unknown block state!");
        }
    }

    /* Set the block sprite to the correct rendering location,
     * keeping animations and offsets in mind.
     * optional nextLine boolean determines if the block should be in the grid
     * or in the bottom line still being added.
     */
    this.render = function(nextLine) {
        //var offset_y = (this.game.pushCounter / this.game.pushTime) * 16;
        var offset_y = (((this.game.pushCounter > 0) ? this.game.pushCounter : 0) / this.game.pushTime) * 16;
        var offset_x = 0;
        var x=0, y=0;
        var sprite_index=0;
        if (!this.sprite)
            return;
        if (!nextLine) {
            x = this.x*16;
            y = this.game.height*16 - (this.y+1)*16 + offset_y;

            switch (this.animation_state) {
                case ANIM_SWAP_LEFT:
                    var step = 16/ANIM_SWAPTIME;
                    x += step * this.animation_counter;
                    break;
                case ANIM_SWAP_RIGHT:
                    var step = 16/ANIM_SWAPTIME;
                    x -= step * this.animation_counter;
                    break;
                case ANIM_CLEAR_BLINK:
                    var frames = BLOCKS.animations.clear;
                    sprite_index = frames[this.animation_counter % frames.length];
                    break;
                case ANIM_CLEAR_FACE:
                    var frames = BLOCKS.animations.face;
                    sprite_index = frames[0];
                    break;
                case ANIM_CLEAR_DEAD:
                    return;
                case ANIM_LAND:
                    var frames = BLOCKS.animations.land;
                    sprite_index = frames[frames.length - this.animation_counter];
                    break;
                default:
                    if (this.isDanger(2)) {
                        var frames = BLOCKS.animations.danger;
                        sprite_index = frames[Math.round(this.game.totalTicks) % frames.length];
                        break;
                    }

            }
        }
        else {
            x = this.x*16;
            y = this.game.height*16 + offset_y;
            sprite_index = 1;
        }
        ctx.drawImage(BLOCKS.sprites[this.sprite], sprite_index*16, 0, 16, 16, x, y, 16, 16);
    }

    /* This block will give its state and sprite to the block under it and then
     * reset to an empty block.
     */
    this.fall = function() {
        this.under.state = this.state;
        this.under.counter = this.counter;
        this.under.sprite = this.sprite;
        this.under.chain = this.chain;

        this.state = STATIC;
        this.counter = 0;
        this.sprite = null;
        this.chain = false;
    }

    /* Swap this block with its right neighbour.
     */
    this.swap = function() {
        var temp_sprite = this.right.sprite;

        this.right.sprite = this.sprite;
        this.right.chain = false;

        this.sprite = temp_sprite;
        this.chain = false;

        if (this.sprite == null) {
            this.state = SWAP;
            this.counter = 0;
        }
        else {
            this.state = SWAP;
            this.counter = SWAPTIME;
            this.animation_state = ANIM_SWAP_LEFT;
            this.animation_counter = ANIM_SWAPTIME;
        }

        if (this.right.sprite == null) {
            this.right.state = SWAP;
            this.right.counter = 0;
        }
        else {
            this.right.state = SWAP;
            this.right.counter = SWAPTIME;
            this.right.animation_state = ANIM_SWAP_RIGHT;
            this.right.animation_counter = ANIM_SWAPTIME;
        }
    }

    /* Erase the contents of this block and start a chain in
     * its upper neighbour.
     */
    this.erase = function() {
        this.sprite = null;
        this.state = STATIC;
        this.counter = 0;
        this.chain = false;
        if (this.above.sprite)
            this.above.chain = true;
    }

    /* Sets this blocks state to CLEAR.
     *
     * returns chain where
     * chain is a boolean telling if this block is part of a chain.
     */
    this.clear = function() {
        if (!this.game.combo.includes(this)) {
            this.game.combo.push(this);
        }

        return this.chain;
    }

    /* Combos and Chains the current block with its neighbours.
     *
     * Sets the relevant blocks to clear and returns chain where
     * chain is a boolean telling if this combo is part of a chain.
     */
    this.cnc = function() {
        var chain = false;

        if (!this.isClearable()) {
            return false;
        }

        if (this.left.isClearable() && this.right.isClearable()) {
            if (this.left.sprite == this.sprite
                    && this.right.sprite == this.sprite) {
                var left = this.left.clear();
                var middle = this.clear();
                var right = this.right.clear();

                if (middle || left || right) {
                    chain = true;
                }
            }
        }

        if (this.above.isClearable() && this.under.isClearable()) {
            if (this.above.sprite == this.sprite
                    && this.under.sprite == this.sprite) {
                var above = this.above.clear();
                var middle = this.clear();
                var under = this.under.clear();

                if (middle || above || under) {
                    chain = true;
                }
            }
        }

        return chain;
    }

    this.isDanger = function(height) {
        if (!height)
            height = 2;
        for (var y=this.game.height-1; y>(this.game.height-1)-height; y--) {
            if (this.game.blocks[this.x][y].sprite) {
                return true;
            }
        }
    }
}


/* The Tetris Attack Game object
 * Contains a 2d array of block objects which will be rendered on screen.
 * Keeps track of blocks, chains, combos and score.
 */

function TaGame() {
    this.width = null;
    this.height = null;
    this.nr_blocks = null;
    this.blocks = null;
    this.nextLine = null;
    this.combo = null;
    this.chain = null;
    this.config = null;
    this.command = null;
    this.cursor = null;
    this.wall = null;
    this.score = 0;
    this.scoreText = null;
    this.pushTime = 0;
    this.pushCounter = 0;
    this.totalTicks = 0;

    /* Initializes a new game.
     *
     * width is the width of the blocks array.
     * height is the height of the blocks array.
     * nr_blocks is the number of different block sprites to be used.
     */
    this.newGame = function(width, height, nr_blocks) {
        this.width = width;
        this.height = height;
        this.nr_blocks = nr_blocks;
        this.blocks = this.newBlocks(width, height);
        this.fillBlocks(this.blocks, width, 4);
        this.nextLine = this.newBlocks(width, 1);
        this.fillBlocks(this.nextLine, width, 1);
        this.command = null; // not done
        this.cursor = Cursor.create(this);
        this.chain = 0;
        this.combo = [];
        this.pushTime = PUSHTIME;
        this.pushCounter = this.pushTime;

        this.score = 0;
        //this.scoreText = GLOBAL.game.add.text(0, 0, '0', { fontSize: '10px', fill: '#fff'});
        //this.scoreText.setTextBounds(50, 0, 46, 32);
        //this.scoreText.boundsAlignH = 'right';
        //this.scoreText.align = 'right';
        //this.scoreText.lineSpacing = -7;

        this.wall = new Block();
        this.wall.initWall(this);

        this.updateNeighbors();
        //this.render();
    }

    /* Adds a new line of blocks to the bottom of the grid and pushes the rest
     * up. If there is not enough room a the top, the game will game-over.
     *
     * Returns 1 if succesfull.
     */
    this.push = function() {
        if (this.isDanger(1)) {
            this.gameOver();
            return 0;
        }
        var blocks = this.newBlocks(this.width, this.height);
        for (var x=0; x<this.width; x++) {
            for (var y=0; y<this.height-1; y++) {
                blocks[x][y+1] = this.blocks[x][y];
            }
            this.blocks[x][this.height-1].erase();
            blocks[x][0] = this.nextLine[x][0];
        }
        this.blocks = blocks;
        this.nextLine = this.newBlocks(6, 1);
        this.fillBlocks(this.nextLine, 6, 1);
        if (this.cursor.y < this.height-1)
            this.cursor.y++;

        return 1;
    }

    this.pushTick = function(count) {
        if (this.chain)
            return;
        this.pushCounter -= count;
        if (this.pushCounter <= 0) {
            this.pushCounter = this.pushTime;
            this.score += this.push();
        }
    }

    this.pushFast = function() {
        this.pushTick(100);
    }

    /* Ends the current game.
     */
    this.gameOver = function() {
        for (var x=0; x<this.width; x++) {
            for (var y=0; y<this.height; y++) {
                if (this.blocks[x][y].sprite)
                    //this.blocks[x][y].sprite.animations.play('face');
                this.tick = function() {
                    console.log("game over bitch");
                }
                MainLoop.stop();
            }
            //this.nextLine[x][0].sprite.animations.play('face');
        }
        this.pushCounter = 0;
    }

    /* Create a grid of block objects.
     *
     * width is the width of the grid.
     * height is the height of the grid.
     * returns the grid.
     */
    this.newBlocks = function(width, height) {
        var blocks = new Array(width);
        for (var x=0; x<width; x++) {
            blocks[x] = new Array(height);
            for (var y=0; y<height; y++) {
                blocks[x][y] = new Block();
                blocks[x][y].init(this, x, y);
            }
        }
        return blocks;
    }

    /* Fills a specified portions of a block grid with random block sprites.
     *
     * blocks is the grid to be filled
     * width is the width of the portion to fill
     * height is the height of the portion to fill
     */
    this.fillBlocks = function(blocks, width, height) {
        for (var x=0; x<width; x++) {
            for (var y=0; y<height; y++) {
                blocks[x][y].newBlock();
            }
        }
    }

    /* Updates the neighbor references in each block in the grid.
     */
    this.updateNeighbors = function() {
        var block;
        for (var x = 0; x<this.width; x++) {
            for (var y = 0; y<this.height; y++) {
                block = this.blocks[x][y];

                if (x > 0) {
                    block.left = this.blocks[x-1][y];
                } else {
                    block.left = this.wall;
                }

                if (x < this.width-1) {
                    block.right = this.blocks[x+1][y];
                } else {
                    block.right = this.wall;
                }

                if (y > 0) {
                    block.under = this.blocks[x][y-1];
                } else {
                    block.under = this.wall;
                }

                if (y < this.height-1) {
                    block.above = this.blocks[x][y+1];
                } else {
                    block.above = this.wall;
                }
            }
        }
    }

    /* Updates the state of the grid.
     * Blocks are only dependent on the state of their under-neighbor, so
     * this can be done from the bottom up.
     */
    this.updateState = function() {
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                this.blocks[x][y].updateState();
                this.blocks[x][y].x = x;
                this.blocks[x][y].y = y;
            }
        }
    }

    /* Update the combos and chain for the entire grid.
     *
     * Returns [combo, chain] where
     * combo is the amount of blocks participating in the combo
     * chain is whether a chain is currently happening.
     */
    this.updateCnc = function() {
        var combo;
        var chain = false;

        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if(this.blocks[x][y].cnc())
                    chain = true;
            }
        }
        this.combo.sort(function(a, b) {
            if (a.y < b.y)
                return 1;
            if (a.y > b.y)
                return -1;
            if (a.y == b.y) {
                if (a.x > b.x)
                    return 1;
                if (a.x < b.x)
                    return -1;
            }
            return 0;
        });

        combo = this.combo.length;
        while((block = this.combo.pop()) != undefined) {
            block.state = CLEAR;
            block.counter = CLEAREXPLODETIME * combo + CLEARBLINKTIME + CLEARPAUSETIME;
            block.animation_state = ANIM_CLEAR_BLINK;
            block.animation_counter = ANIM_CLEARBLINKTIME;
            block.explode_counter = (this.combo.length+1) * CLEAREXPLODETIME;
        }


        return [combo, chain];
    }

    /* Swaps two blocks at location (x,y) and (x+1,y) if swapping is possible
     */
    this.swap = function(x, y) {
        if (!this.blocks[x][y].isSwappable()
            || !this.blocks[x+1][y].isSwappable())
            return;
        this.blocks[x][y].swap();
    }

    /* Checks if the current chain is over.
     * returns a boolean
     */
    this.chainOver = function() {
        var chain = true;
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if (this.blocks[x][y].chain) {
                    chain = false;
                }
            }
        }
        return chain;
    }

    /* Converts an amount of blocks in a combo to the corresponding score
     * combo is an int
     * returns a int as score
     */
    this.comboToScore = function(combo) {
        switch(combo) {
            case 4:
                return 20;
            case 5:
                return 30;
            case 6:
                return 50;
            case 7:
                return 60;
            case 8:
                return 70;
            case 9:
                return 80;
            case 10:
                return 100;
            case 11:
                return 140;
            case 12:
                return 170;
            default:
                return 0;
        }
    }

    /* Converts the lenght of a chain to the corresponding score
     * chain is an int
     * returns a int as score
     */
    this.chainToScore = function(chain) {
        switch(chain) {
            case 2:
                return 50;
            case 3:
                return 80;
            case 4:
                return 150;
            case 5:
                return 300;
            case 6:
                return 400;
            case 7:
                return 500;
            case 8:
                return 700;
            case 9:
                return 900;
            case 10:
                return 1100;
            case 11:
                return 1300;
            case 12:
                return 1500;
            case 13:
                return 1800;
            default:
                return 0;
        }
    }

    /* Checks if any block sprites are close to the top of the grid.
     *
     * height is the distance to the top.
     * returns a boolean
     */
    this.isDanger = function(height) {
        for (var x=0; x<this.width; x++) {
            for (var y=this.height-1; y>(this.height-1)-height; y--) {
                if (this.blocks[x][y].sprite) {
                    return true;
                }
            }
        }
        return false;
    }

    /* The tick function is the main function of the TaGame object.
     * It gets called every tick and executes the other internal functions.
     * It will update the grid,
     * calculate the current score,
     * spawn possible garbage.
     */
    this.tick = function() {
        kd.tick();
        this.totalTicks++;
        this.pushTick(1);
        this.updateNeighbors();
        this.updateState();
        // combo n chain
        var cnc = this.updateCnc();
        if (this.chain) {
            if (this.chainOver()) {
                console.log("chain over");
                this.chain = 0;
            }
        }

        if (cnc[0] > 0) {
            var current = 0;
            for (var y=0; y<this.height; y++) {
                for (var x=0; x<this.width; x++) {
                    if (this.blocks[x][y].state == CLEAR) {
                        this.blocks[x][y].counter = CLEAREXPLODETIME*cnc[0] + CLEARBLINKTIME + CLEARPAUSETIME;
                        current++;
                    }
                    if (current == cnc[0])
                        break;
                }
                if (current == cnc[0])
                    break;
            }
        }

        /* Calculate the current score */
        if (cnc[0] > 0) {
            console.log("combo is ", cnc);
            this.score += (cnc[0] * 10)
            this.score += this.comboToScore(cnc[0]);
            if (cnc[1]) {
                this.chain++;
                console.log("chain is ", this.chain + 1);
            }
            if (this.chain) {
                this.score += this.chainToScore(this.chain + 1);
            }
            console.log("Score: ", this.score);
        }
        // spawn garbage

    }

    /* Updates the coordinates of the sprite objects to the corresponding
     * coordinates in the grid. Then copies the entire grid to an upscaled
     * canvas to maintain pixelart.
     */
    this.render = function() {

        // Establish draw clipping to limit drawn game area
        ctx.save();

        ctx.beginPath();
        ctx.lineWidth = 10;
        ctx.rect(0, 0, 16 * GAME_WIDTH, 16 * (GAME_HEIGHT + 1));
        ctx.clip();

        ctx.fillRect(0,0, 16*this.width, 16*(this.height+1));
        for (var x=0; x<this.width; x++) {
            for (var y=0; y<this.height; y++) {
                this.blocks[x][y].render();
            }
        }
        for (var x=0; x<this.width; x++) {
            this.nextLine[x][0].render(true)
        }

        this.cursor.render();

        var score = "" + this.score;
        var chain = "";
        if (this.chain) {
            chain += "chain: " + (this.chain + 1);
        }

        ctx.fillStyle = '#FFF';
        ctx.fillText(score, GAME_WIDTH * 16 - ctx.measureText(score).width, 10);
        ctx.fillText(chain, GAME_WIDTH * 16 - ctx.measureText(chain).width, 20);
        ctx.fillStyle = '#000';

        //this.scoreText.text = text;

        //GLOBAL.block_layer.y = (this.pushCounter/this.pushTime) * 16;
        //GLOBAL.cursor_layer.y = (this.pushCounter/this.pushTime) * 16;

        //PIXELCANVAS.pixelcontext.drawImage(GLOBAL.game.canvas, 0, 0, GAME_WIDTH*16, (GAME_HEIGHT+1)*16, 0, 0, PIXELCANVAS.pixelwidth, PIXELCANVAS.pixelheight);

        ctx.restore();

    }
}

/* The Controller interface */
var Controller = Object.create(null);
Controller.init = null;
Controller.free = null;
Controller.bindLeft = null;
Controller.bindRight = null;
Controller.bindUp = null;
Controller.bindDown = null;
Controller.bindSwitch = null;
Controller.bindPush = null;

/* The GamepadController prototype */
var GamepadController = Object.create(Controller);

GamepadController.activeGamepads = [];

GamepadController.updateAll = function() {
    for(var i = 0; i < GamepadController.activeGamepads.length; i++) {
        GamepadController.activeGamepads[i].update();
    }
}

GamepadController.create = function(gamepad) {

    var controller = Object.create(GamepadController);
    controller.gamepad = standardizeGamepad(gamepad);

    return controller;
}

GamepadController.update = function() {

    // In SNES terms
    // D-pad is buttons 12 (up), 13(down), 14(left), 15(right)
    // "A" is 1, "B" is 0, "X" is 3, "Y" is 2, "L" is 4, "R" is 5
    if( this.gamepad.buttons[12].pressed && !this.upState && this.upCb ) {
        this.upCb();
    }
    this.upState = this.gamepad.buttons[12].pressed;

    if( this.gamepad.buttons[13].pressed && !this.downState && this.downCb ) {
        this.downCb();
    }
    this.downState = this.gamepad.buttons[13].pressed;

    if( this.gamepad.buttons[14].pressed && !this.leftState && this.leftCb ) {
        this.leftCb();
    }
    this.leftState = this.gamepad.buttons[14].pressed;

    if( this.gamepad.buttons[15].pressed && !this.rightState && this.rightCb ) {
        this.rightCb();
    }
    this.rightState = this.gamepad.buttons[15].pressed;

    // L or R are pressed, push
    if( this.gamepad.buttons[4].pressed || this.gamepad.buttons[5].pressed ) {
        this.pushCb();
    }

    // "A" or "B" are pressed, switch
    if( this.gamepad.buttons[1].pressed && !this.switchState && this.switchCb ) {
        this.switchCb();
    }
    this.switchState = this.gamepad.buttons[1].pressed;

}

GamepadController.init = function() {

    this.leftState = false;
    this.rightState = false;
    this.upState = false;
    this.downState = false;
    this.switchState = false;
    this.pushState = false;

    this.leftCb = null;
    this.rightCb = null;
    this.upCb = null;
    this.downCb = null;
    this.switchCb = null;
    this.pushCb = null;

    GamepadController.activeGamepads.push(this);
    // Needs to be run as part of the animation frame loop
}

GamepadController.free = function() {
    GamepadController.activeGamepads.find(this);
}

GamepadController.bindLeft = function(cb) {
    this.leftCb = cb;
}

GamepadController.bindRight = function(cb) {
    this.rightCb = cb;
}

GamepadController.bindUp = function(cb) {
    this.upCb = cb;
}

GamepadController.bindDown = function(cb) {
    this.downCb = cb;
}

GamepadController.bindSwitch = function(cb) {
    this.switchCb = cb;
}

GamepadController.bindPush = function(cb) {
    this.pushCb = cb;
}

/* The KeyboardController prototype */
var KeyboardController = Object.create(Controller);

KeyboardController.preventDefaultCb = null;
KeyboardController.leftKey = null;
KeyboardController.rightKey = null;
KeyboardController.upKey = null;
KeyboardController.downKey = null;
KeyboardController.switchKey = null;
KeyboardController.pushKey = null;

KeyboardController.init = function() {

    if(this.preventDefaultCb) {
        this.free();
    }

    var keys = [
        this.leftKey.keyCode,
        this.rightKey.keyCode,
        this.upKey.keyCode,
        this.downKey.keyCode,
        this.switchKey.keyCode,
        this.pushKey.keyCode
    ];

    this.preventDefaultCb = window.addEventListener('keydown', function(e) {
        if (keys.includes(e.keyCode)) {
            e.preventDefault();
        }
    }, false);

    this.bindLeft = this.leftKey.press.bind(kd.LEFT);
    this.bindRight = this.rightKey.press.bind(kd.RIGHT);
    this.bindUp = this.upKey.press.bind(kd.UP);
    this.bindDown = this.downKey.press.bind(kd.DOWN);
    this.bindSwitch = this.switchKey.press.bind(kd.SPACE);
    this.bindPush = this.pushKey.down.bind(kd.C);

}

KeyboardController.free = function() {
    this.leftKey.unbindPress();
    this.rightKey.unbindPress();
    this.upKey.unbindPress();
    this.downKey.unbindPress();
    this.switchKey.unbindPress();
    this.pushKey.unbindDown();
    window.removeEventListener('keydown', this.preventDefaultCb);
    this.preventDefaultCb = null;
}

/* The DefaultKeyboardController prototype */
var DefaultKeyboardController = Object.create(KeyboardController);

DefaultKeyboardController.leftKey = kd.LEFT;
DefaultKeyboardController.rightKey = kd.RIGHT;
DefaultKeyboardController.upKey = kd.UP;
DefaultKeyboardController.downKey = kd.DOWN;
DefaultKeyboardController.switchKey = kd.SPACE;
DefaultKeyboardController.pushKey = kd.C;

// TODO add support for customizable keyboard controls

/* The Cursor prototype */
var Cursor = Object.create(null);
Cursor.x = null;
Cursor.y = null;
Cursor.left = null;
Cursor.right = null;
Cursor.sprite = null;
Cursor.game = null;
Cursor.controller = null;

Cursor.create = function(game) {

    var cursor = Object.create(Cursor);
    this.game = game;
    // center the cursor
    cursor.x = Math.floor(game.width / 2) - 1;
    cursor.y = Math.floor(game.height / 3);

    cursor.left = game.blocks[cursor.x][cursor.y];
    cursor.right = game.blocks[cursor.x+1][cursor.y];

    // temp sprite
    cursor.sprite = 1;

    cursor.setController(DefaultKeyboardController);

    return cursor;
}

Cursor.setController = function(controller) {
    if(this.controller != null) {
        this.controller.free();
    }
    this.controller = controller;
    this.controller.init();
    this.controller.bindLeft(this.mv_left.bind(this));
    this.controller.bindRight(this.mv_right.bind(this));
    this.controller.bindUp(this.mv_up.bind(this));
    this.controller.bindDown(this.mv_down.bind(this));
    this.controller.bindSwitch(this.mv_swap.bind(this));
    this.controller.bindPush(this.game.pushFast.bind(this.game));
}

Cursor.mv_left = function(cursor) {
    this.x -= this.x > 0;
}

Cursor.mv_right = function(cursor) {
    this.x += (this.x < this.game.width - 2);
}

Cursor.mv_down = function(cursor) {
    this.y -= (this.y > 0);
}

Cursor.mv_up = function(cursor) {
    this.y += this.y < this.game.height - 1;
}

Cursor.mv_swap = function() {
    this.game.swap(this.x, this.y);
}

Cursor.render = function() {
    var frames = CURSORS.animations.idle;
    var sprite_index = frames[Math.round(this.game.totalTicks / 10) % frames.length];
    var offset = (((this.game.pushCounter > 0) ? this.game.pushCounter : 0) / this.game.pushTime) * 16;
    ctx.drawImage(CURSORS.sprites[this.sprite], sprite_index*38, 0, 38, 22, this.x*16 - 3, this.game.height*16 - (this.y+1)*16 - 3 + offset, 38, 22);
}

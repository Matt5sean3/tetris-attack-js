var canvas = document.getElementById('tetris-canvas');
// Adjusts canvas size to show on-screen controller debugging
canvas.height = 16 * (GAME_HEIGHT + 1) * SCALE + GAMEPAD_DEBUGGER_HEIGHT;
canvas.width = Math.max(16 * GAME_WIDTH * SCALE, GAMEPAD_DEBUGGER_WIDTH);
var ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.scale(SCALE, SCALE);
ctx.fillStyle = '#000';
ctx.font = '12px arial';
ctx.fillRect(0,0, 16 * GAME_WIDTH, 16 * (GAME_HEIGHT + 1) + GAMEPAD_DEBUGGER_HEIGHT);

function loadSprites(blocks, cursors) {
    var i;
    for (i=1; i<=blocks.names.length; i++) {
        blocks.sprites[i] = new Image();
        blocks.sprites[i].src = 'sprites/' + blocks.names[i-1] + '.png';
    }
    GLOBAL.nrBlockSprites = blocks.names.length;

    for (i=1; i<=cursors.names.length; i++) {

        cursors.sprites[i] = new Image();
        cursors.sprites[i].src = 'sprites/' + cursors.names[i-1] + '.png';
    }
    GLOBAL.nrCursorSprites = cursors.names.length;
}

function render() {

    // Check gamepad button state transitions
    GamepadController.updateAll();

    if(navigator.getGamepads().length >= 1) {

        ctx.save();
    
        // override the transform
        ctx.setTransform(1, 0, 0, 1, 0, SCALE * 16 * (GAME_HEIGHT + 1) );
        drawGamepadDebugger(ctx, standardizeGamepad(navigator.getGamepads()[0]) );

        ctx.restore();
    }

    GLOBAL.taGame_list.forEach(function(game) {
        game.render();
    });
}

loadSprites(BLOCKS, CURSORS);

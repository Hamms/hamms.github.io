$(function(){

    var canvas = document.getElementById('exampleCanvas'),
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;

    var drawxy = function(x,y,color){
        ctx.fillStyle = color;
        ctx.fillRect(x*10,y*10,10,10);
        ctx.strokeRect(x*10,y*10,10,10);
    };

    var board, width, height;

    var buildBoard = function(){
        board = []
        width = canvas.width/10
        height = canvas.height/10

        var density = $("#density").val()/100.0

        for (var i=0; i<width; ++i){
            board[i] = []
            for (var j=0; j<height; ++j){
                if (Math.random() < density) {
                    drawxy(i,j,"white")
                    board[i][j] = true
                } else {
                    drawxy(i,j,"black")
                    board[i][j] = false
                }
            }
        }
        startx = 0;
        starty = Math.floor(Math.random()*height);
        endx = width - 1;
        endy = Math.floor(Math.random()*height);
        drawxy(startx,starty, "blue");
        drawxy(endx,endy, "red");

        board[startx][starty] = true;
        board[endx][endy] = true;
    }

    var heur = function(x,y){
        return Math.abs(endx-x) + Math.abs(endy-y)
    }

    var solveBoard = function(callback){
        var closedset = {};
        var openset = [[startx,starty]];
        var path = {};

        g_score = {}
        g_score[startx] = {}
        g_score[startx][starty] = 0
        f_score = {}
        f_score[startx] = {}
        f_score[startx][starty] = heur(startx, starty)

        var current = [startx,starty]
        var indexOfCurrent = 0

        var interval = setInterval(function(){
            if (openset.length == 0) {
            clearInterval(interval);
            callback(false);
            } else {
            current = openset[0];
            indexOfCurrent = 0;
            // current = the node in openset having the lowest f_score
            for (var i=0; i<openset.length; ++i) {
                var node = openset[i]
                if (f_score[node[0]][node[1]] < f_score[current[0]][current[1]]){
                    current = node;
                    indexOfCurrent = i;
                }
            }

            if (current[0] == endx && current[1] == endy) {
                //woooo, we're done!
                callback(path);
                clearInterval(interval);
            }

            if (current[0] != startx || current[1] != starty)
                drawxy(current[0],current[1], "cyan")

            openset.splice(indexOfCurrent,1)
            if(!(current[0] in closedset)){
                closedset[current[0]] = {}
            }
            closedset[current[0]][current[1]] = true // ???

            for (var x=current[0]-1;x<=current[0]+1;x+=1){
                for (var y=current[1]-1;y<=current[1]+1;y+=1){
                    if (
                        (x == current[0] || y == current[1]) && // only orthogonal movement
                        !(x == current[0] && y == current[1]) && // ignore case when node == current
                        !(x in closedset && y in closedset[x]) &&    // if node is not in closed set
                        (x >= 0 && x < width) && (y >= 0 && y < height) && // if node is within bounds
                        board[x][y] == true // if node is not an obstacle
                        ) {

                        var tentative_g_score = g_score[current[0]][current[1]] + 1;
                        if (!openset.some(function(node){return node[0] == x && node[1] == y}) || (tentative_g_score < g_score[x][y])) {
                            if (!(x in path)) { path[x] = {} }
                            if (!(x in g_score)) { g_score[x] = {} }
                            if (!(x in f_score)) { f_score[x] = {} }
                            path[x][y] = current
                            g_score[x][y] = tentative_g_score
                            f_score[x][y] = g_score[x][y] + heur(x,y)
                            if (!openset.some(function(node){return node[0] == x && node[1] == y})){
                                openset.push([x,y])
                                //drawxy(x,y,"red")
                            }
                        }
                    }
                }
            }
            }
        }, 5);
    }

    var draw = function(path){
        var x = endx, y = endy;
        var step = path[endx][endy]
        var interval = setInterval(function () {
            if(step[0] != startx || step[1] != starty){
            drawxy(step[0],step[1],"green")
            step = path[step[0]][step[1]]
            } else {
            clearInterval(interval);
            }
        }, 10);
    }

    $('#redraw').click(function(){
        buildBoard();
        solveBoard(function(path){
            if (path === false) {
                alert("no solution")
            } else {
                draw(path);
            }
        });
    });
    buildBoard();
    solveBoard(function(path){
        if (path === false) {
            alert("no solution")
        } else {
            draw(path);
        }
    });
});

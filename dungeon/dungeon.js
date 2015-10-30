var DIRECTIONS = {
  UP: {
    x: 0,
    y: -1
  },
  DOWN: {
    x: 0,
    y: 1
  },
  LEFT: {
    x: -1,
    y: 0
  },
  RIGHT: {
    x: 1,
    y: 0
  },
};

var utils = {
  randomChoice: function (array) {
    return array[Math.floor(Math.random() * array.length)];
  },
  randomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },
  RGB2HTML: function (red, green, blue) {
    var decColor = 0x1000000 + blue + 0x100 * green + 0x10000 * red;
    return '#' + decColor.toString(16).substr(1);
  },
  valueInRange: function (value, min, max) {
    return (value >= min) && (value <= max);
  },
};

var Stage = function (width, height) {
  this.width = width;
  this.height = height;

  this.colors = {
    0: '#FFFFFF'
  };

  this.tiles = [];
  for (var i = 0; i < (height * width); i++) {
    this.tiles.push(0);
  }
};

Stage.prototype.getTile = function (pos) {
  x = pos.x % this.width;
  y = pos.y % this.height;
  return this.tiles[y * this.width + x];
};

Stage.prototype.carveTile = function (pos, color) {
  x = pos.x % this.width;
  y = pos.y % this.height;
  this.tiles[y * this.width + x] = color;
};

Stage.prototype.draw = function (canvas) {
  var tilewidth = (canvas.width / this.width);
  var tileheight = (canvas.height / this.height);
  var ctx = canvas.getContext("2d");
  this.getTiles().forEach(function (tile) {
    var color = this.colors[tile.tile];
    if (color === undefined) {
      color = utils.RGB2HTML(utils.randomInt(50, 200), utils.randomInt(50, 200), utils.randomInt(50, 200));
      this.colors[tile.tile] = color;
    }
    ctx.fillStyle = color;
    ctx.fillRect(tile.x * tilewidth, tile.y * tileheight, tilewidth, tileheight);
  }, this);
};

Stage.prototype.contains = function (pos) {
  return (pos.x >= 0 && pos.x < this.width && pos.y >= 0 && pos.y < this.height);
};

Stage.prototype.getTiles = function () {
  return this.tiles.map(function (tile, i) {
    return {
      tile: tile,
      x: i % this.width,
      y: Math.floor(i / this.width)
    };
  }, this);
};

var Room = function (x, y, width, height) {
  this.x = x;
  this.y = y;
  this.width = width;
  this.height = height;
};

Room.prototype.overlaps = function (other) {

  var overlaps_x = utils.valueInRange(this.x, other.x, other.x + other.width) ||
    utils.valueInRange(other.x, this.x, this.x + this.width);

  var overlaps_y = utils.valueInRange(this.y, other.y, other.y + other.height) ||
    utils.valueInRange(other.y, this.y, this.y + this.height);

  return overlaps_x && overlaps_y;
};

Room.prototype.positions = function () {
  var positions = [];
  for (var i = this.x; i < (this.x + this.width); i++) {
    for (var j = this.y; j < (this.y + this.height); j++) {
      positions.push({
        x: i,
        y: j
      });
    }
  }
  return positions;
};

var Dungeon = function () {

  this.numRoomTries = 10000;
  this.extraConnectorChance = 0.2;
  this.roomExtraSize = 3;
  this.windingPercent = 0.2;

  this.rooms;
  this.regions;
  this.currentRegion;

  this.stage;
};

Dungeon.prototype.startRegion = function () {
  this.currentRegion++;
};

/**
 * @param {start} - Object
 * @param {start.x} - number
 * @param {start.y} - number
 */
Dungeon.prototype.growMaze = function (start) {
  var cells = [];
  var lastDir;

  this.startRegion();
  this.carve(start);

  cells.push(start);

  while (cells.length > 0) {
    var cell = cells[cells.length - 1];

    var unmadeCells = this.carvableDirections(cell);

    if (unmadeCells.length > 0) {
      var should_continue_straight = unmadeCells.indexOf(lastDir) > -1 &&
        Math.random() > this.windingPercent;
      var dir = should_continue_straight ? lastDir : utils.randomChoice(unmadeCells);

      this.carve(this.moveInDirection(cell, dir, 1));
      this.carve(this.moveInDirection(cell, dir, 2));

      cells.push(this.moveInDirection(cell, dir, 2));
      lastDir = dir;
    } else {
      cells.pop();
      lastDir = null;
    }

  }
};

Dungeon.prototype.addRooms = function () {
  for (var i = 0; i < this.numRoomTries; i++) {
    // Pick a random room size. The funny math here does two things:
    // - It makes sure rooms are odd-sized to line up with maze.
    // - It avoids creating rooms that are too rectangular: too tall and
    //   narrow or too wide and flat.
    // TODO: This isn't very flexible or tunable. Do something better here.
    var size = utils.randomInt(1, 3 + this.roomExtraSize) * 2 + 1;
    var rectangularity = utils.randomInt(0, 1 + size / 2) * 2;
    var width = size;
    var height = size;
    if (Math.random() < 0.5) {
      width += rectangularity;
    } else {
      height += rectangularity;
    }

    var x = utils.randomInt(0, (this.stage.width - width - 1) / 2) * 2 + 1;
    var y = utils.randomInt(0, (this.stage.height - height - 1) / 2) * 2 + 1;

    var room = new Room(x, y, width, height);

    if (!this.roomOverlapAnyExisting(room)) {
      this.rooms.push(room);
      this.startRegion();
      room.positions().forEach(function (pos) {
        this.carve(pos);
      }, this);
    }
  }
};

Dungeon.prototype.roomOverlapAnyExisting = function (room) {
  return this.rooms.some(function (other) {
    return room.overlaps(other);
  });
};

Dungeon.prototype.connectRegions = function () {
  var connectorRegions = {};
  this.stage.getTiles().forEach(function (tile) {
    if (tile.tile === 0) {
      var regions = {};
      Object.keys(DIRECTIONS).forEach(function (dir) {
        var newtile = this.moveInDirection(tile, dir);
        var region = this.regions[newtile.x + ',' + newtile.y];
        if (region !== undefined) {
          regions[region] = true;
        }
      }, this);

      regions = Object.keys(regions);

      if (regions.length >= 2) {
        connectorRegions[tile.x + ',' + tile.y] = regions;
      }
    }
  }, this);

  var connectors = Object.keys(connectorRegions).map(function (string) {
    return {
      x: string.split(',')[0],
      y: string.split(',')[1]
    };
  });

  var merged = {};
  var openRegions = {};
  for (var i = 1; i <= this.currentRegion; i++) {
    merged[i] = i;
    openRegions[i] = true;
  }

  while (Object.keys(openRegions).length > 1 && connectors.length > 0) {
    var connector = utils.randomChoice(connectors);
    this.carve(connector);

    var regions = connectorRegions[connector.x + ',' + connector.y].map(function (region) {
      return merged[region];
    });
    var dest = regions.pop();
    for (var i = 1; i <= this.currentRegion; i++) {
      if (regions.indexOf(merged[i]) > -1) {
        merged[i] = dest;
      }
    }

    regions.forEach(function (region) {
      delete openRegions[region];
    });

    connectors = connectors.filter(function (pos) {
      if (Math.abs(pos.x - connector.x) < 2 && Math.abs(pos.y - connector.y) < 2) return false;

      var regions = {};
      connectorRegions[pos.x + ',' + pos.y].forEach(function (region) {
        regions[merged[region]] = true;
      });

      if (Object.keys(regions).length > 1) return true;

      if (Math.random() < this.extraConnectorChance) {
        this.carve(pos);
      }

      return false;
    }, this);
  }
};

Dungeon.prototype.canCarve = function (pos, dir) {
  if (!this.stage.contains(this.moveInDirection(pos, dir, 3))) {
    return false;
  }

  return this.stage.getTile(this.moveInDirection(pos, dir, 2)) === 0;
};

Dungeon.prototype.carve = function (pos) {
  this.stage.carveTile(pos, this.currentRegion);
  this.regions[pos.x + ',' + pos.y] = this.currentRegion;
};

Dungeon.prototype.moveInDirection = function (cell, dir, spaces) {
  if (typeof dir === 'string') {
    dir = DIRECTIONS[dir];
  }
  spaces = spaces || 1;
  return {
    x: cell.x + (dir.x * spaces),
    y: cell.y + (dir.y * spaces)
  };
};

Dungeon.prototype.carvableDirections = function (cell) {
  return Object.keys(DIRECTIONS).filter(function (dir) {
    return this.canCarve(cell, DIRECTIONS[dir]);
  }, this);
};

Dungeon.prototype.getExits = function (pos) {
  return Object.keys(DIRECTIONS).filter(function (dir) {
    var newtile = this.moveInDirection(pos, dir);
    return this.stage.contains(newtile) && this.stage.getTile(newtile) !== 0;
  }, this).map(function (dir) {
    return this.moveInDirection(pos, dir);
  }, this);
};

Dungeon.prototype.isDeadEnd = function (pos) {
  return this.getExits(pos).length === 1;
};

Dungeon.prototype.removeDeadEnds = function () {

  var deadends = this.stage.getTiles().filter(function (tile) {
    return tile.tile !== 0 && this.isDeadEnd(tile);
  }, this);

  while (deadends.length) {
    var pos = deadends.pop();
    this.stage.carveTile(pos, 0);
    var newPos = this.getExits(pos)[0];
    if (this.isDeadEnd(newPos)) {
      deadends.push(newPos);
    }
  }
};

Dungeon.prototype.generate = function (options) {
  this.numRoomTries = options.numRoomTries || 10000;
  this.extraConnectorChance = options.extraConnectorChance || 0.2;
  this.roomExtraSize = options.roomExtraSize || 3;
  this.windingPercent = options.windingPercent || 0.2;

  this.stage = new Stage(139, 79);
  this.rooms = [];
  this.regions = {};
  this.currentRegion = 0;

  this.addRooms();
  for (var y = 1; y < this.stage.height; y += 2) {
    for (var x = 1; x < this.stage.width; x += 2) {
      var pos = {
        x: x,
        y: y
      };
      if (this.stage.getTile(pos) !== 0) continue;
      this.growMaze(pos);
    }
  }

  this.connectRegions();
  this.removeDeadEnds();
};

document.addEventListener("DOMContentLoaded", function (event) {
  var dungeon = new Dungeon();

  var options = {
    numRoomTries: 10000,
    extraConnectorChance: 0.01,
    roomExtraSize: 3,
    windingPercent: 0.2,
  };

  var setOption = function () {
    options[this.id] = Number(this.value);
  };

  var inputs = document.getElementsByTagName('input');
  for (var i = 0, input;
    (input = inputs[i]); i++) {
    input.addEventListener('change', setOption);
  }

  var button = document.getElementById('redraw');
  button.addEventListener('click', function () {
    dungeon.generate(options);
    dungeon.stage.draw(canvas);
  });

  dungeon.generate(options);
  dungeon.stage.draw(canvas);
});

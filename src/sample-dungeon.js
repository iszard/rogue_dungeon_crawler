import Dungeon from "@mikewesthad/dungeon";

const dungeon = new Dungeon({
  width: 100,
  height: 30,
  doorPadding: 1, // Experimental, minimum number of tiles between a door and a room corner (>= 1)
  //   randomSeed: "hello", // Leave undefined if you don't want to control the seed
  randomSeed: undefined, // Leave undefined if you don't want to control the seed
  rooms: {
    width: {
      min: 5,
      max: 15,
      onlyOdd: true, // or onlyEven: true
    },
    height: {
      min: 5,
      max: 15,
      onlyOdd: true, // or onlyEven: true
    },
    maxArea: 150,
    maxRooms: 50,
  },
});

// Make sure you resize your console (see guide that gets printed out in the console)
dungeon.drawToConsole({
  empty: " ",
  emptyColor: "rgb(0, 0, 0)",
  wall: "#",
  wallColor: "rgb(255, 0, 0)",
  floor: "0",
  floorColor: "rgb(210, 210, 210)",
  door: "x",
  doorColor: "rgb(0, 0, 255)",
  fontSize: "8px",
});

// Helper method for debugging by dumping the map into an HTML fragment (<pre><table>)
const html = dungeon.drawToHtml({
  empty: " ",
  emptyAttributes: { class: "dungeon__empty" },
  wall: "#",
  wallAttributes: { class: "dungeon__wall", style: "color: #950fe2" },
  floor: "x",
  floorAttributes: { class: "dungeon__floor", style: "color: #d2e9ef" },
  door: "*",
  doorAttributes: {
    class: "dungeon__door",
    style: "font-weight: bold; color: #f900c3",
  },
  containerAttributes: { class: "dungeon", style: "font-size: 15px" },
});
document.body.appendChild(html);

dungeon.rooms; // Array of Room instances
dungeon.tiles; // 2D array of tile IDs - see Tile.js for types

// Get a 2D array of tiles where each tile type is remapped to a custom value. Useful if you are
// using this in a tilemap, or if you want to map the tiles to something else, e.g. this is used
// internally to convert a dungeon to an HTML string.
const mappedTiles = dungeon.getMappedTiles({
  empty: 0,
  floor: 1,
  door: 2,
  wall: 3,
});

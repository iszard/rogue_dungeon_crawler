import Phaser from "phaser";
import Dungeon, { Room } from "@mikewesthad/dungeon";
import Player from "./ts/player.js";
import TILES from "./ts/tile-mapping.js";
import TilemapVisibility from "./ts/tilemap-visibility.js";

/**
 * Scene that generates a new dungeon
 */
export default class DungeonScene extends Phaser.Scene {
  player: Player;
  dungeon: Dungeon;
  groundLayer: Phaser.Tilemaps.TilemapLayer;
  stuffLayer: Phaser.Tilemaps.TilemapLayer;

  level: integer;
  hasPlayerReachedStairs: boolean;
  tilemapVisibility: TilemapVisibility;

  constructor() {
    super();
    this.level = 0;
  }

  preload() {
    this.load.image(
      "tiles",
      "../assets/tilesets/buch-tileset-48px-extruded.png"
    );
    this.load.spritesheet(
      "characters",
      "../assets/spritesheets/buch-characters-64px-extruded.png",
      {
        frameWidth: 64,
        frameHeight: 64,
        margin: 1,
        spacing: 2,
      }
    );
  }

  create() {
    this.level++;
    this.hasPlayerReachedStairs = false;

    // Generate a random world with a few extra options:
    //  - Rooms should only have odd number dimensions so that they have a center tile.
    //  - Doors should be at least 2 tiles away from corners, so that we can place a corner tile on
    //    either side of the door location
    this.dungeon = new Dungeon({
      width: 50,
      height: 50,
      doorPadding: 2,
      rooms: {
        width: { min: 7, max: 15, onlyOdd: true },
        height: { min: 7, max: 15, onlyOdd: true },
      },
    });

    this.dungeon.drawToConsole({
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

    // Create a blank tilemap with dimensions matching the dungeon
    const map = this.make.tilemap({
      tileWidth: 48,
      tileHeight: 48,
      width: this.dungeon.width,
      height: this.dungeon.height,
    });
    const tileset = map.addTilesetImage("tiles", undefined, 48, 48, 1, 2)!; // 1px margin, 2px spacing
    this.groundLayer = map
      .createBlankLayer("Ground", tileset)! // Wall & floor
      .fill(TILES.BLANK);
    this.stuffLayer = map.createBlankLayer("Stuff", tileset)!; // Chest, stairs, etc.
    const shadowLayer: Phaser.Tilemaps.TilemapLayer = map
      .createBlankLayer("Shadow", tileset)! // Wall & floor
      .fill(TILES.BLANK);

    this.tilemapVisibility = new TilemapVisibility(shadowLayer);

    // Use the array of rooms generated to place tiles in the map
    // Note: using an arrow function here so that "this" still refers to our scene
    this.dungeon.rooms.forEach((room) => {
      const { x, y, width, height, left, right, top, bottom } = room;

      // Fill the floor with mostly clean tiles
      this.groundLayer.weightedRandomize(
        TILES.FLOOR,
        x + 1,
        y + 1,
        width - 2,
        height - 2
      );

      // Place the room corners tiles
      this.groundLayer.putTileAt(TILES.WALL.TOP_LEFT, left, top);
      this.groundLayer.putTileAt(TILES.WALL.TOP_RIGHT, right, top);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_RIGHT, right, bottom);
      this.groundLayer.putTileAt(TILES.WALL.BOTTOM_LEFT, left, bottom);

      // Fill the walls with mostly clean tiles
      this.groundLayer.weightedRandomize(
        TILES.WALL.TOP,
        left + 1,
        top,
        width - 2,
        1
      );
      this.groundLayer.weightedRandomize(
        TILES.WALL.BOTTOM,
        left + 1,
        bottom,
        width - 2,
        1
      );
      this.groundLayer.weightedRandomize(
        TILES.WALL.LEFT,
        left,
        top + 1,
        1,
        height - 2
      );
      this.groundLayer.weightedRandomize(
        TILES.WALL.RIGHT,
        right,
        top + 1,
        1,
        height - 2
      );

      // Dungeons have rooms that are connected with doors. Each door has an x & y relative to the
      // room's location. Each direction has a different door to tile mapping.
      const doors = room.getDoorLocations(); // → Returns an array of {x, y} objects
      for (let i = 0; i < doors.length; i++) {
        if (doors[i].y === 0) {
          this.groundLayer.putTilesAt(
            TILES.DOOR.TOP,
            x + doors[i].x - 1,
            y + doors[i].y
          );
        } else if (doors[i].y === room.height - 1) {
          this.groundLayer.putTilesAt(
            TILES.DOOR.BOTTOM,
            x + doors[i].x - 1,
            y + doors[i].y
          );
        } else if (doors[i].x === 0) {
          this.groundLayer.putTilesAt(
            TILES.DOOR.LEFT,
            x + doors[i].x,
            y + doors[i].y - 1
          );
        } else if (doors[i].x === room.width - 1) {
          this.groundLayer.putTilesAt(
            TILES.DOOR.RIGHT,
            x + doors[i].x,
            y + doors[i].y - 1
          );
        }
      }
    });

    // Separate out the rooms into:
    //  - The starting room (index = 0)
    //  - A random room to be designated as the end room (with stairs and nothing else)
    //  - An array of 90% of the remaining rooms, for placing random stuff (leaving 10% empty)
    const rooms = this.dungeon.rooms.slice();
    const startRoom = rooms.shift();
    const endRoom = Phaser.Utils.Array.RemoveRandomElement(rooms) as Room;
    const otherRooms = Phaser.Utils.Array.Shuffle(rooms).slice(
      0,
      rooms.length * 0.9
    ) as Room[];

    // Place the stairs
    this.stuffLayer.putTileAt(TILES.STAIRS, endRoom.centerX, endRoom.centerY);

    // Place stuff in the 90% "otherRooms"
    otherRooms.forEach((room) => {
      const rand = Math.random();
      if (rand <= 0.25) {
        // 25% chance of chest
        this.stuffLayer.putTileAt(TILES.CHEST, room.centerX, room.centerY);
      } else if (rand <= 0.5) {
        // 50% chance of a pot anywhere in the room... except don't block a door!
        const x = Phaser.Math.Between(room.left + 2, room.right - 2);
        const y = Phaser.Math.Between(room.top + 2, room.bottom - 2);
        this.stuffLayer.weightedRandomize(TILES.POT, x, y, 1, 1);
      } else {
        // 25% of either 2 or 4 towers, depending on the room size
        if (room.height >= 9) {
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX - 1,
            room.centerY + 1
          );
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX + 1,
            room.centerY + 1
          );
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX - 1,
            room.centerY - 2
          );
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX + 1,
            room.centerY - 2
          );
        } else {
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX - 1,
            room.centerY - 1
          );
          this.stuffLayer.putTilesAt(
            TILES.TOWER,
            room.centerX + 1,
            room.centerY - 1
          );
        }
      }
    });

    // Not exactly correct for the tileset since there are more possible floor tiles, but this will
    // do for the example.
    this.groundLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);
    this.stuffLayer.setCollisionByExclusion([-1, 6, 7, 8, 26]);

    this.stuffLayer.setTileIndexCallback(
      TILES.STAIRS,
      () => {
        this.stuffLayer.setTileIndexCallback(TILES.STAIRS, () => {}, this);
        this.hasPlayerReachedStairs = true;
        this.player.freeze();
        const cam = this.cameras.main;
        cam.fade(250, 0, 0, 0);
        cam.once("camerafadeoutcomplete", () => {
          this.player.destroy();
          this.scene.restart();
        });
      },
      this
    );

    // Place the player in the first room
    const playerRoom = startRoom!;
    const x = map.tileToWorldX(playerRoom.centerX) as number;
    const y = map.tileToWorldY(playerRoom.centerY) as number;
    this.player = new Player(this, x, y);

    // Watch the player and tilemap layers for collisions, for the duration of the scene:
    this.physics.add.collider(this.player.sprite, this.groundLayer);
    this.physics.add.collider(this.player.sprite, this.stuffLayer);

    // Phaser supports multiple cameras, but you can access the default camera like this:
    const camera = this.cameras.main;

    // Constrain the camera so that it isn't allowed to move outside the width/height of tilemap
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.startFollow(this.player.sprite);

    // Help text that has a "fixed" position on the screen
    this.add
      .text(
        16,
        16,
        `Find the stairs. Go deeper.\nCurrent level: ${this.level}`,
        {
          font: "18px monospace",
          fill: "#000000",
          padding: { x: 20, y: 10 },
          backgroundColor: "#ffffff",
        } as Phaser.Types.GameObjects.Text.TextStyle
      )
      .setScrollFactor(0);
  }

  update(time, delta) {
    if (this.hasPlayerReachedStairs) return;

    this.player.update();

    // Find the player's room using another helper method from the dungeon that converts from
    // dungeon XY (in grid units) to the corresponding room object
    const playerTileX = this.groundLayer.worldToTileX(this.player.sprite.x);
    const playerTileY = this.groundLayer.worldToTileY(this.player.sprite.y);
    const playerRoom = this.dungeon.getRoomAt(playerTileX, playerTileY);

    this.tilemapVisibility.setActiveRoom(playerRoom);
  }
}

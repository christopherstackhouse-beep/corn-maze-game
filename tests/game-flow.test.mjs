import {test} from 'node:test';
import assert from 'node:assert/strict';
import {game} from './helpers/game.mjs';
test('capture time and goodwill freeze at the net hit, before victory animation',async()=>{
 const g=game();g.run('ArcadeLeaderboard.beginRun();ArcadeLeaderboard.tick(12850);ArcadeLeaderboard.capture(77);ArcadeLeaderboard.tick(99000);ArcadeLeaderboard.capture(1);ArcadeLeaderboard.victory();');
 assert.equal(g.nodes.captureSummary.textContent,'CAPTURE TIME 0:12 · GUEST GOODWILL 77%');g.nodes.arcadeName.value='ARCADE TEST';await g.nodes.scoreEntry.events.submit({preventDefault(){}});
 const sent=JSON.parse(g.requests.find(r=>r.path==='/api/scores').options.body);assert.equal(sent.elapsedSeconds,12);assert.equal(sent.goodwill,77);assert.equal(g.nodes.scoreMessage.textContent,'Score saved! You are #1.');
});
test('alien defeat waits for the video to end and supports pause/resume and mute',()=>{
 const g=game();g.run("generateMaze();spawnGuests();resetAlien();alienScene='burn';playing=true;startAlienVideo();updateAlien(60)");assert.equal(g.run('finished'),false);assert.equal(g.nodes.alienFilm.hidden,false);
 const plays=g.nodes.alienFilmVideo.playCount;g.windowEvents.blur();assert.equal(g.run('playing'),false);assert(g.nodes.alienFilmVideo.pauseCount>0);g.run('resume()');assert.equal(g.nodes.alienFilmVideo.playCount,plays+1);
 g.nodes.sound.onclick();assert.equal(g.nodes.alienFilmVideo.muted,true);
 g.nodes.alienFilmVideo.events.ended();assert.equal(g.run('finished'),true);assert.equal(g.nodes.alienFilm.hidden,true);assert.equal(g.nodes.endTag.textContent,'CLOSE ENCOUNTER: TERMINATED');assert.equal(g.nodes.endTitle.textContent,'You are now locally sourced ash.');assert.equal(g.nodes.endText.textContent,'The alien caught you. Its ship incinerated you from orbit. Next time, try offering a map.');
});
test('map extraction has continuous stages, restores goodwill, and returns to the maze',()=>{
 const g=game();g.run('generateMaze();spawnGuests();resetAlien();nerve=12;helpAlien()');assert.equal(g.run('nerve'),100);
 let previousLift=0;
 for(const t of [0,.5,1.2,2.5,3.5,4.5,5.8,6.5,7.5,8.1]){g.run(`alienClock=${t};drawAlienScene()`);const pose=g.run(`extractionPose(${t})`);assert(Number.isFinite(pose.opacity));assert(pose.lift>=previousLift);previousLift=pose.lift;}
 g.run('alienClock=0;updateAlien(EXTRACTION_DURATION-.1)');assert.equal(g.run('alienScene'),'extract');g.run('updateAlien(.2)');assert.equal(g.run('alienScene'),null);assert.equal(g.run('alien.state'),'gone');assert.equal(g.run('finished'),false);assert.equal(g.nodes.hud.hidden,false);
});

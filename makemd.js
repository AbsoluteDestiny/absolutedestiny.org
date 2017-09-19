const fs = require("fs");
const path = require("path");
const yaml = require("yamljs");
const slug = require("slug");
const config = require("./alldata20170919.json");

// const models = new Set(config.map(c => c.model));
// let data = {};
const thumbnails = [];
const data = [];
const vids = config.filter(c => c.model === "vid.vid");
const footage = config.filter(c => c.model === "vid.footage");
const audiosource = config.filter(c => c.model === "vid.audiosource");
const genre = config.filter(c => c.model === "vid.genre");
const videofile = config.filter(c => c.model === "vid.videofile");
const subtitle = config.filter(c => c.model === "vid.subtitle");

// console.log(vids.filter(v => v.fields.audio.length > 1));

vids.forEach(v => {
  const sdStream = v.fields.videos
    .map(g => videofile.find(el => el.pk === g).fields)
    .filter(a => a.streaming === "sd")[0];
  const hdStream = v.fields.videos
    .map(g => videofile.find(el => el.pk === g).fields)
    .filter(a => a.streaming === "hd")[0];
  const srt = v.fields.subs.map(g => subtitle.find(el => el.pk === g))[0];
  const vid = {
    title: v.fields.title,
    date: v.fields.date_released,
    published: !v.fields.secret,
    thumbnail: v.fields.thumbnail.split("/")[2],
    description: v.fields.description,
    lyrics: v.fields.lyrics,
    footage: v.fields.footage.map(g => {
      const source = footage.find(el => el.pk === g).fields;
      return `${source.title} (${source.year})`;
    }),
    song: v.fields.audio.map(
      g => audiosource.find(el => el.pk === g).fields.title
    )[0],
    artist: v.fields.audio.map(
      g => audiosource.find(el => el.pk === g).fields.artist
    )[0],
    song_info_url: v.fields.audio.map(
      g => audiosource.find(el => el.pk === g).fields.info_url
    )[0],
    downloads: v.fields.videos.map(g => {
      const { fields } = videofile.find(el => el.pk === g);
      return {
        url: fields.attachment.split("/")[1],
        width: fields.width,
        height: fields.height,
        mimetype: fields.mimetype
      };
    }),
    srt: srt ? srt.fields.attachment.split("/")[1] : null,
    sd_stream: sdStream ? sdStream.attachment.split("/")[1] : null,
    hd_stream: hdStream ? hdStream.attachment.split("/")[1] : null,
    tags: v.fields.genres.map(g => genre.find(el => el.pk === g).fields.title),
  };
  // console.log(new Date(vid.date_released));
  // console.log(yaml.stringify(vid));
  data.push(vid);
  thumbnails.push(vid.thumbnail);
});

data
  .sort((a, b) => new Date(b.date_released) - new Date(a.date_released))
  .reverse();

data.forEach((el, i) => {
  const vid = el;
  vid.vid_id = i.toString().padStart(3, "0");

  const contents = `---
${yaml.stringify(vid)}
---
${vid.description}`;
  fs.writeFileSync(
    path.join("./src/vids/", `${vid.vid_id}-${slug(vid.title)}.md`),
    contents
  );
});

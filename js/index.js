/* global window, document, site */
import { TweenRex } from '@tweenrex/core';
import { interpolate } from 'polymorph-js';
import { interpolate as d3Interpolate } from 'd3-interpolate';
import { easeInOut } from "just-curves";
import Navigo from "navigo";
import Plyr from "plyr";
import Hls from "hls.js";

function getSVGPaths() {
  const svgPaths = {};
  
  function getPathData(svg) {
    const data = [];
    Array.prototype.forEach.call(svg.querySelectorAll("path"), path => {
      data.push({
        fill: path.getAttribute("fill") || "transparent",
        d: path.getAttribute("d")
      });
    });
    return data;
  }

  svgPaths.none = getPathData(document.getElementById("bgsvg"));
  Array.prototype.forEach.call(
    document.querySelectorAll("svg[data-vid-svg]"),
    svg => {
      svgPaths[svg.id.split("svg-")[1]] = getPathData(svg);
    }
  );
  return svgPaths;
}

function main() {
  document.getElementById('details').style = '';
  const svgPaths = getSVGPaths();
  const svgDuration = 1000;
  let lastX = 0;
  let lastY = 0;
  const playerContainer = document.querySelector(".c-video");
  const playerEl = document.getElementById("videoPlayer");
  let hls;
  const hlsConfig = { autoStartLoad: false, maxBufferSize: 20 * 1024 * 1024 };
  const player = new Plyr(playerEl);
  if (Hls.isSupported()) {
    hls = new Hls(hlsConfig);
  }

  function morph(to, delay = 0) {
    const target = document.getElementById("bgsvg");
    Array.prototype.forEach.call(target.querySelectorAll("path"), (path, i) => {
      if (path && i < to.length) {
        const interpolator = interpolate([path.getAttribute("d"), to[i].d]);
        const colors = d3Interpolate(path.getAttribute("fill"), to[i].fill);
        const tween = TweenRex({
          duration: svgDuration,
          delay,
          easing: easeInOut
        });
        tween.subscribe(o => {
          path.setAttribute("d", interpolator(o));
          path.setAttribute("fill", colors(o));
        });

        tween.play();
      }
    });
  }

  function setActiveVid(id) {
    player.stop();
    playerContainer.classList.remove("is-loaded");
    if (id !== "none") {
      lastX = window.pageXOffset;
      lastY = window.pageYOffset;
    }
    document
      .getElementById("bgsvg")
      .setAttribute(
        "preserveAspectRatio",
        id === "none" ? "xMinYMin slice" : "xMidYMid slice"
      );
    Array.prototype.forEach.call(
      document.querySelectorAll(".is-active"),
      el => {
        el.classList.remove("is-active");
      }
    );

    if (id === "none") {
      document.title = `Home | ${site.title}`;
      document
        .querySelector('[property="og:url"]')
        .setAttribute("content", `${site.url}`);
      document
        .querySelector('[property="og:title"]')
        .setAttribute("content", `${site.title}`);
      document
        .querySelector('[property="og:image"]')
        .setAttribute("content", `${site.url}media/ad-love-and-pop-og.jpg`);
      document
        .querySelector('[property="og:description"]')
        .setAttribute("content", `${site.description}`);
      document
        .querySelector('[name="twitter:title"]')
        .setAttribute("content", `${site.title}`);
      document
        .querySelector('[name="twitter:description"]')
        .setAttribute("content", `${site.description}`);
      document
        .querySelector('[name="twitter:image"]')
        .setAttribute("content", `${site.url}media/ad-love-and-pop-og.jpg`);
      document
        .querySelector('[name="twitter:url"]')
        .setAttribute("content", `${site.url}`);
      document.body.classList.remove("has-vid");
      document.querySelector("img[data-vid-img]").classList.remove("is-loaded");
      hls.detachMedia(playerEl);
      hls.destroy();
      player.fullscreen.exit();
      playerEl.setAttribute("src", "");
      if (Hls.isSupported()) {
        hls = new Hls(hlsConfig);
      }
      morph(svgPaths[id]);
      window.scrollTo(lastX, lastY);
      return;
    }
    const vidNav = document.querySelector(`[data-vid="${id}"]`);
    const vidDetails = document.querySelector(`[data-vid-details="${id}"]`);
    const metaTitle = vidNav.getAttribute("data-meta-title");
    const metaDescription = vidNav.getAttribute("data-meta-description");
    const img =
      vidNav.getAttribute("data-img") ||
      "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    const srt = vidNav.getAttribute("data-srt");
    const ogImg = img.replace(".jpg", "-og.jpg");
    document.title = `${metaTitle} | ${site.title}`;
    document
      .querySelector('[property="og:url"]')
      .setAttribute("content", window.location.href);
    document
      .querySelector('[property="og:title"]')
      .setAttribute("content", document.title);
    document
      .querySelector('[property="og:image"]')
      .setAttribute("content", window.location.origin + ogImg);
    document
      .querySelector('[property="og:description"]')
      .setAttribute("content", metaDescription);
    document
      .querySelector('[name="twitter:title"]')
      .setAttribute("content", document.title);
    document
      .querySelector('[name="twitter:description"]')
      .setAttribute("content", metaDescription);
    document
      .querySelector('[name="twitter:image"]')
      .setAttribute("content", window.location.origin + ogImg);
    document
      .querySelector('[name="twitter:url"]')
      .setAttribute("content", window.location.href);
    vidNav.style = '';
    vidNav.classList.add("is-active");
    vidDetails.style = '';
    vidDetails.classList.add("is-active");
    document.body.classList.add("has-vid");
    morph(svgPaths[id]);
    document.querySelector("img[data-vid-img]").src = img;
    const playbackId = vidNav.getAttribute("data-muxid");
    let autoStopped = true;
    if (playbackId) {
      playerEl.setAttribute(
        "poster",
        `https://image.mux.com/${playbackId}/thumbnail.jpg?time=21`
      );
      if (Hls.isSupported()) {
        player.on("play", () => {
          if (autoStopped) {
            hls.startLoad(-1);
          }
          autoStopped = false;
        });
        if (srt) {
          playerEl.innerHTML = `<track id="vidCaptions" kind="captions" label="English captions" src="/media/${srt}" srclang="en">`;
        } else {
          playerEl.innerHTML = "";
        }
        hls.loadSource(`https://stream.mux.com/${playbackId}.m3u8`);
        hls.attachMedia(playerEl);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          playerContainer.classList.add("is-loaded");
        });
      }
    }
  }
  const root = window.location.origin;
  const useHash = false;
  const hash = "#!";
  const router = new Navigo(root, useHash, hash);
  router
    .on(/vid\/(\d+)-(\w+)\/?/, id => {
      // console.log(id);
      setActiveVid(id);
    })
    .on({
      "*": () => {
        // console.log("none");
        setActiveVid("none");
      }
    })
    .resolve();
}

main();

// src/components/LiveMap/MapVisualization.jsx
import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import { ATTACK_TYPE_COLORS } from "./attackStyles";

export default function MapVisualization({
  attacks = [],
  width = 1400,
  height = 720
}) {
  const ref = useRef(null);
  const topoUrl = "/world-110m.json";
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      ref.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle zoom slider change
  const handleZoomChange = (e) => {
    const newZoom = parseFloat(e.target.value);
    setZoomLevel(newZoom);
    if (ref.current?.zoomAPI) {
      ref.current.zoomAPI.setZoom(newZoom);
    }
  };

  useEffect(() => {
    const container = d3.select(ref.current);
    container.selectAll("*").remove();

    // SVG BASE
    const svg = container
      .append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "100%")
      .style("cursor", "grab");

    // =========================================================
    // 1) NEON GLOW FILTER
    // =========================================================
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "marker-glow");

    glow.append("feDropShadow")
      .attr("dx", "0")
      .attr("dy", "0")
      .attr("stdDeviation", "4")
      .attr("flood-color", "#00ffe0")
      .attr("flood-opacity", "1");


    // =========================================================
    // BACKGROUND GRADIENT + VIGNETTE
    // =========================================================

    // Ocean gradient
    const oceanGradient = defs.append("radialGradient")
      .attr("id", "ocean-gradient")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "65%");

    oceanGradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#002034");

    oceanGradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#000b1a");

    // Country glow filter
    const countryGlow = defs.append("filter")
      .attr("id", "country-glow");

    countryGlow.append("feGaussianBlur")
      .attr("stdDeviation", 3)
      .attr("result", "blur");

    countryGlow.append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .enter()
      .append("feMergeNode")
      .attr("in", d => d);

    // Apply background
    svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#ocean-gradient)");


    // MAP GROUP
    const g = svg.append("g").attr("class", "map-group");

    // Background
    // g.append("rect")
    //   .attr("width", width)
    //   .attr("height", height)
    //   .attr("fill", "#000b1a");

    // Projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.2)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const countriesLayer = g.append("g").attr("class", "countries");
    const arcsLayer = g.append("g").attr("class", "arcs");
    const markersLayer = g.append("g").attr("class", "markers");

    // =========================================================
    // 2) ZOOM HANDLER
    // =========================================================
    const zoom = d3.zoom()
      .scaleExtent([0.8, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        setZoomLevel(event.transform.k); // Update slider when zoomed
      });

    svg.call(zoom);

    // Expose zoom API to parent
    ref.current.zoomAPI = {
      zoomIn: () => svg.transition().call(zoom.scaleBy, 1.25),
      zoomOut: () => svg.transition().call(zoom.scaleBy, 0.8),
      reset: () => svg.transition().call(zoom.scaleTo, 1),
      setZoom: (level) => svg.transition().call(zoom.scaleTo, level)
    };

    // =========================================================
    // 3) LOAD WORLD MAP
    //=========================================================
    d3.json(topoUrl).then((topology) => {
      const world = feature(topology, topology.objects.countries);

      countriesLayer
        .selectAll("path")
        .data(world.features)
        .join("path")
        .attr("d", path)
        .attr("fill", "#0a1f33")            // darker premium blue
        .attr("stroke", "#2fa8ff")          // neon border
        .attr("stroke-width", 0.35)
        .style("filter", "url(#country-glow)")
        .attr("opacity", 0.92);


      renderAttacks(attacks);
    });

    // =========================================================
    // 4) ATTACK RENDERING (markers + arcs)
    // =========================================================
    function renderAttacks(attacksList) {
      const visible = (attacksList || []).slice(0, 150).reverse();

      // ---------------------
      // MARKERS
      // ---------------------
      const points = [];
      visible.forEach((a) => {
        if (a.src_lat && a.src_lng)
          points.push({
            key: `src-${a.id}`,
            lat: a.src_lat,
            lng: a.src_lng,
            score: a.threat_score
          });

        if (a.dst_lat && a.dst_lng)
          points.push({
            key: `dst-${a.id}`,
            lat: a.dst_lat,
            lng: a.dst_lng,
            score: a.threat_score
          });
      });

      const markerSel = markersLayer
        .selectAll("circle.marker")
        .data(points, (d) => d.key);

      const markerEnter = markerSel.enter()
        .append("circle")
        .attr("class", "marker")
        .attr("r", 0)
        .attr("fill", "#00ffe0")
        .attr("fill-opacity", 0.95)
        .attr("stroke", "#66ffff")
        .attr("stroke-width", 1.2)
        .style("filter", "url(#marker-glow)")
        .each(function () {
          const node = d3.select(this);
          let pulses = 3; // number of pulses

          function pulse() {
            if (pulses === 0) {
              node.attr("r", 3.5); // final size, stay visible
              return;
            }

            pulses--;

            node
              .transition()
              .duration(900)
              .attr("r", 6)
              .transition()
              .duration(900)
              .attr("r", 3.5)
              .on("end", pulse);
          }

          pulse();
        });


      markerSel.merge(markerEnter)
        .attr("cx", (d) => projection([d.lng, d.lat])[0])
        .attr("cy", (d) => projection([d.lng, d.lat])[1])
        .style("filter", (d) => {
          const glow = Math.min(10, (d.score || 50) / 12);
          return `drop-shadow(0 0 ${glow}px #00ffe0)`;
        });

      markerSel.exit().remove();

      // ---------------------
      // ARCS
      // ---------------------
      const arcs = visible
        .map((a) =>
          a.src_lat && a.dst_lat
            ? {
              id: a.id,
              source: [a.src_lng, a.src_lat],
              target: [a.dst_lng, a.dst_lat],
              attack_type: a.attack_type,
              score: a.threat_score
            }
            : null
        )
        .filter(Boolean);

      const arcSel = arcsLayer
        .selectAll("path.attack-arc")
        .data(arcs, (d) => d.id);

      arcSel
        .enter()
        .append("path")
        .attr("class", "attack-arc")
        .attr("fill", "none")
        .attr("stroke-linecap", "round")
        .merge(arcSel)
        .attr("stroke", (d) => ATTACK_TYPE_COLORS[d.attack_type] || "#ff3366")
        .attr("stroke-width", (d) => Math.max(1, (d.score || 50) / 40))
        .attr("d", (d) => {
          const s = projection(d.source);
          const t = projection(d.target);
          const mid = [(s[0] + t[0]) / 2, (s[1] + t[1]) / 2 - 40];
          return `M${s[0]},${s[1]} Q${mid[0]},${mid[1]} ${t[0]},${t[1]}`;
        })
        .each(function () {
          const node = d3.select(this);
          const totalLength = this.getTotalLength
            ? this.getTotalLength()
            : 200;

          let loops = 3; // animate 3 times

          function animate() {
            if (loops === 0) {
              node
                .transition()
                .duration(700)
                .attr("stroke-opacity", 0)
                .remove();
              return;
            }

            loops--;

            node
              .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
              .attr("stroke-dashoffset", totalLength)
              .attr("stroke-opacity", 1)
              .transition()
              .duration(1400)
              .ease(d3.easeLinear)
              .attr("stroke-dashoffset", 0)
              .on("end", animate);
          }

          animate();
        });


      arcSel.exit().remove();
    }

    // 5) React → D3 update
    svg.on("updateAttacks", (event) => {
      renderAttacks(event.detail || []);
    });

    return () => container.selectAll("*").remove();
  }, []);

  // =========================================================
  // Re-render when attacks update
  // =========================================================
  useEffect(() => {
    const svg = d3.select(ref.current).select("svg");
    if (svg.node()) {
      svg.dispatch("updateAttacks", { detail: attacks });
    }
  }, [attacks]);

  // =========================================================
  // RENDER COMPONENT
  // =========================================================
  return (
  <div
    style={{
      width: "100%",
      height: "100%",
      minHeight: "650px",
      position: "relative"
    }}
  >

    {/* ---- MAP LAYER ---- */}
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 1
      }}
    />

    {/* ░░ BOTTOM ZOOM BAR (Lovable-style) ░░ */}
    <div
      style={{
        position: "absolute",
        bottom: "22px",
        left: "50%",
        transform: "translateX(-50%)",
        background: "#0f1419",
        border: "1px solid #1c3f63",
        padding: "12px 18px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        zIndex: 9999,
        pointerEvents: "auto"
      }}
    >
      <span style={{ color: "#cdeaff", fontSize: "13px", marginRight: 8 }}>
        ZOOM
      </span>

      {/* Slider Control */}
      <input
        type="range"
        min="0.8"
        max="8"
        step="0.1"
        defaultValue="1"
        onChange={(e) => {
          const scale = parseFloat(e.target.value);
          if (ref.current?.zoomAPI?.setZoom) {
            ref.current.zoomAPI.setZoom(scale);
          }
        }}
        style={{
          width: "200px",
          accentColor: "#00e0ff",
          cursor: "pointer"
        }}
      />

      {/* Fullscreen Button */}
      <button
        onClick={() => {
          if (!document.fullscreenElement) {
            ref.current?.requestFullscreen?.();
          } else {
            document.exitFullscreen();
          }
        }}
        style={{
          width: "34px",
          height: "34px",
          borderRadius: "6px",
          border: "1px solid #1c3f63",
          background: "#0f1419",
          color: "#00eaff",
          fontSize: "16px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "0.2s ease"
        }}
      >
        ⤢
      </button>
    </div>

  </div>
);


}

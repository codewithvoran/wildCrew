function Map({ lng, lat }) {
  return (
    <div>
      <iframe
        title="Event location"
        width="100%"
        height="300"
        style={{ border: 0, borderRadius: "12px" }}
        loading="lazy"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${
          lng - 0.01
        },${lat - 0.01},${lng + 0.01},${
          lat + 0.01
        }&layer=mapnik&marker=${lat},${lng}`}
      />
    </div>
  );
}

export default Map;

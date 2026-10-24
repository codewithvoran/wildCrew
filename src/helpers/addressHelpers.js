export const formatAddress = (properties) => {
  const streetAddress =
    properties.housenumber && properties.street
      ? `${properties.housenumber} ${properties.street}`
      : properties.street;

  return [
    properties.name,
    streetAddress,
    properties.district,
    properties.city,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
};

export const searchAddresses = async (query) => {
  const response = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
  );

  if (!response.ok) {
    throw new Error("Failed to search addresses.");
  }

  const data = await response.json();

  return data.features.filter(
    (feature) => feature.properties.country === "Canada",
  );
};

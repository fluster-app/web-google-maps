export interface WebGoogleMapsMarker extends google.maps.MarkerOptions {
  lat?: number;
  lng?: number;
  infoWindowOptions?: google.maps.InfoWindowOptions;
}

export interface WebGoogleMapsMarkers {
  markers: WebGoogleMapsMarker[];
  fitBounds: boolean;
}

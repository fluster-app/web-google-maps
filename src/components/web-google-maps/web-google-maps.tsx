import {Component, Element, Event, EventEmitter, Listen, Prop, Watch} from '@stencil/core';

import {WebGoogleMapsStyle} from '../../types/web-google-maps/web-google-maps-style';
import {WebGoogleMapsCircle} from '../../types/web-google-maps/web-google-maps-circle';
import {WebGoogleMapsMarker, WebGoogleMapsMarkers} from '../../types/web-google-maps/web-google-maps-markers';
import {WebGoogleMapsOptions} from '../../types/web-google-maps/web-google-maps-options';

@Component({
  tag: 'web-google-maps',
  styleUrl: 'web-google-maps.scss',
  shadow: true
})
export class WebGoogleMaps {

  @Event() googleMapsApiKeyLoaded: EventEmitter<void>;

  @Element() el: HTMLElement;

  @Prop() apiKey: string;

  @Prop() lat: number;
  @Prop() lng: number;

  @Prop() options: WebGoogleMapsOptions;

  @Prop() mapStyle: WebGoogleMapsStyle;

  @Prop() circles: WebGoogleMapsCircle[];

  @Prop() markers: WebGoogleMapsMarkers;

  private googleMapsLoaded: boolean = false;

  private bounds: google.maps.LatLngBounds;

  private singleInfoWindow: google.maps.InfoWindow;

  componentWillLoad() {
    this.loadGoogleMapsApi();
  }

  @Watch('apiKey')
  private loadGoogleMapsApi() {
    if (this.googleMapsLoaded || !this.apiKey) {
      return;
    }

    const scripts = document.getElementById('webGoogleMapsApiKey');
    if (scripts) {
      // The Google Maps script should only be load once
      return;
    }

    const script = document.createElement('script');
    script.onload = () => {
      this.googleMapsApiKeyLoaded.emit();
    };
    script.id = 'webGoogleMapsApiKey';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + this.apiKey;
    script.defer = true;

    document.head.appendChild(script);
  }

  @Listen('document:googleMapsApiKeyLoaded')
  async initGoogleMaps(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      if (!google.maps) {
        reject(new Error('Google Maps not loaded'));
        return;
      }

      if (!this.lat || !this.lng) {
        reject(new Error('Google Maps center or lat/lng not defined'));
        return;
      }

      let mapOptions: google.maps.MapOptions = this.normalizeGoogleMapsOptions();

      mapOptions.center = new google.maps.LatLng(this.lat, this.lng);

      const mapDiv: HTMLImageElement = this.el.shadowRoot.querySelector('div.gmap');

      if (this.mapStyle && this.mapStyle.styles) {
        mapOptions.mapTypeControlOptions = {mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']};
        mapOptions.mapTypeControl = false;
      } else {
        mapOptions.mapTypeId = google.maps.MapTypeId.ROADMAP;
      }

      const map: google.maps.Map = new google.maps.Map(mapDiv, mapOptions);

      if (this.mapStyle && this.mapStyle.styles) {
        const styledMap: google.maps.StyledMapType = new google.maps.StyledMapType(this.mapStyle.styles, {name: this.mapStyle.name});

        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');
      }

      google.maps.event.addListenerOnce(map, 'idle', async () => {
        await this.addCircles(map);
        await this.addMarkers(map);
        this.fitMapToBounds(map);
      });

      this.googleMapsLoaded = true;

      resolve();
    });
  }

  private normalizeGoogleMapsOptions(): google.maps.MapOptions {
    const mapOptions: google.maps.MapOptions = {
      zoom: 15,
      scrollwheel: false,
      draggable: false,
      disableDoubleClickZoom: true,
      streetViewControl: false,
      clickableIcons: true,
      fullscreenControl: false
    };

    return {...mapOptions, ...this.options};
  }

  private addCircles(map: google.maps.Map): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.circles && this.circles.length > 0) {
        this.circles.forEach((circle: WebGoogleMapsCircle) => {
          if (!circle.center && circle.lat && circle.lng) {
            circle.center = new google.maps.LatLng(circle.lat, circle.lng);
          }

          if (circle.center && circle.radius) {
            circle.map = map;

            new google.maps.Circle(circle);
          }
        });
      }

      resolve();
    });
  }

  private addMarkers(map: google.maps.Map): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.markers && this.markers.markers && this.markers.markers.length > 0) {
        this.markers.markers.forEach((markerOptions: WebGoogleMapsMarker) => {
          if (!markerOptions.position && markerOptions.lat && markerOptions.lng) {
            markerOptions.position = new google.maps.LatLng(markerOptions.lat, markerOptions.lng);
          }

          if (markerOptions.position) {
            markerOptions.map = map;

            const marker: google.maps.Marker = new google.maps.Marker(markerOptions);

            this.addMarkerToBounds(markerOptions.position);

            this.addInfoWindow(map, marker, markerOptions.infoWindowOptions);
          }
        });
      }

      this.fitMapToBounds(map);

      resolve();
    });
  }

  private addMarkerToBounds(position: google.maps.LatLng | google.maps.LatLngLiteral) {
    if (!this.bounds) {
      this.bounds = new google.maps.LatLngBounds();
    }

    this.bounds.extend(position);
  }

  private addInfoWindow(map: google.maps.Map, marker: google.maps.Marker, infoWindowOptions: google.maps.InfoWindowOptions) {
    if (!infoWindowOptions || !infoWindowOptions.content) {
      return;
    }

    google.maps.event.addListener(marker, 'click', () => {
      // close window if not undefined
      if (this.singleInfoWindow !== void 0) {
        this.singleInfoWindow.close();
      }

      this.singleInfoWindow = new google.maps.InfoWindow(infoWindowOptions);
      this.singleInfoWindow.open(map, marker);
    });
  }

  private fitMapToBounds(map: google.maps.Map) {
    if (this.markers && this.markers.fitBounds && this.bounds) {
      map.fitBounds(this.bounds);
    }
  }

  render() {
    return <div class="gmap"></div>;
  }
}

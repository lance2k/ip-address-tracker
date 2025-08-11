"use client";

import { useEffect, useMemo } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L, { Icon } from "leaflet"
import "leaflet/dist/leaflet.css"

type Props = {
  center: [number, number]
  zoom?: number
  markerLabel?: string
  markerIconUrl?: string
}

function ChangeView({ center, zoom = 13 }: { center: [number, number]; zoom?: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export default function MapView({ center, zoom = 13, markerLabel, markerIconUrl = "/images/icon-location.svg" }: Props) {
  const icon: Icon = useMemo(
    () =>
      L.icon({
        iconUrl: markerIconUrl,
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
      }),
    [markerIconUrl]
  )

  return (
  <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <ChangeView center={center} zoom={zoom} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={icon}>
        {markerLabel ? <Popup>{markerLabel}</Popup> : null}
      </Marker>
    </MapContainer>
  )
}

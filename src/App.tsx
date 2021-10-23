import 'regenerator-runtime/runtime' // avoid error: regeneratorRuntime is not defined

import * as React from 'react'
import {useEffect, useRef, useState} from "react"
import { initializeApp } from "firebase/app"
import { getFirestore, doc, onSnapshot } from "firebase/firestore"
import 'moment/locale/gl'
import moment from 'moment'
import * as L from 'leaflet'
import * as turf from '@turf/turf'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import { MapContainer, Polyline, TileLayer, Marker, Popup } from 'react-leaflet'

import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIconShadow from 'leaflet/dist/images/marker-shadow.png'
import geoJson from './track.json'

const firebaseApp = initializeApp({
    apiKey: process.env.REACT_APP_FIREBASE_APIKEY,
    projectId: process.env.REACT_APP_FIREBASE_PROJECTID
})

const db = getFirestore()

export const MarkerIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerIconShadow,
    iconSize: L.Icon.Default.prototype.options.iconSize,
    shadowSize: L.Icon.Default.prototype.options.shadowSize,
    iconAnchor: L.Icon.Default.prototype.options.iconAnchor,
    shadowAnchor: L.Icon.Default.prototype.options.shadowAnchor,
    popupAnchor:L.Icon.Default.prototype.options.popupAnchor,
})

const turfLine = turf.lineString(geoJson.coordinates.map(p => [p[1], p[0]]))

export default function App() {
    const lineRef = useRef(null)
    const [gpsDate, setGpsDate] = useState(null)
    const [gpsDistancia, setGpsDistancia] = useState(null)
    const [latLng, setLatLng] = useState(null)
    const [mapDom, setMapDom] = useState(null)
    const [tracker, setTracker] = useState({})

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "gps", "013949005389872"), (doc) => {
            // console.log("Current data: ", doc.data());
            const data = doc.data()
            console.info('UPDATE MARKER', [data.lat, data.lng])
            // console.info(turfLine)
            const point = turf.point([data.lng, data.lat], )
            const cercano = nearestPointOnLine(turfLine, point, {units: 'kilometers'})
            // console.info(cercano);
            setGpsDate(moment.unix(data.date.seconds).format('LLL'))
            // console.info(data.date)
            if (cercano && cercano.properties) {
                setGpsDistancia(cercano.properties.dist)
                if (cercano.properties.dist < 5) {
                    setLatLng([cercano.geometry.coordinates[1], cercano.geometry.coordinates[0]])
                } else {
                    console.info('SITUANDO EN SALIDA')
                    setLatLng(geoJson.coordinates[0])
                }
            } else {
                console.info('SITUANDO EN SALIDA')
                setGpsDistancia('desconocido')
                setLatLng(geoJson.coordinates[0])
            }
        });
        if(lineRef && lineRef.current && mapDom) {
            mapDom.fitBounds(lineRef.current.getBounds());
        }
        return unsub;
    }, [mapDom])

    return (
        <MapContainer
            whenCreated={ mapInstance => {setMapDom(mapInstance) } }
            className="absolute top-0 right-0 left-0 bottom-0"
            center={[51.505, -0.09]} zoom={13} scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Polyline
                ref={lineRef}
                pathOptions={{color: 'red'}}
                positions={geoJson.coordinates}
            />
            {latLng && <Marker position={latLng} icon={MarkerIcon}>
                <Popup>
                  Última lectura <b>{gpsDate}</b> <br />
                    Encontrado a <b>{gpsDistancia} km</b> de la línea
                </Popup>
            </Marker>}
        </MapContainer>
    )
}

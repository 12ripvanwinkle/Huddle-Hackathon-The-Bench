function haversineDistance(coords1, coords2) {
    let lat_d = (coords2.latitude - coords1.latitude) * Math.PI/180;
    let lon_d = (coords2.longitude - coords1.longitude) * Math.PI/180;
    lat = (lat_d) * Math.PI/180;
    lon = (lon_d) * Math.PI/180;
    
    let a = Math.pow(Math.sin(lat_d/2), 2)+
            Math.pow(Math.sin(lon_d/2))*
            Math.cos(lat)*Math.cos(lon)
        r = 6371
        d = 2*r*Math.asin(Math.sqrt(a))
    return d
}
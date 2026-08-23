FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install --no-install-recommends --yes curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --home-dir /home/graphhopper graphhopper
WORKDIR /app
RUN mkdir graph-cache && chown graphhopper:graphhopper graph-cache
COPY --chown=graphhopper:graphhopper graphhopper-web-11.0.jar ./graphhopper-web-11.0.jar
COPY --chown=graphhopper:graphhopper indonesia-260821.osm.pbf ./indonesia-260821.osm.pbf
COPY --chown=graphhopper:graphhopper config-log.yml truck_small.json truck_medium.json truck_large.json ./
USER graphhopper
EXPOSE 8989
ENTRYPOINT ["java", "-Xms2g", "-Xmx4g", "-jar", "graphhopper-web-11.0.jar", "server", "config-log.yml"]

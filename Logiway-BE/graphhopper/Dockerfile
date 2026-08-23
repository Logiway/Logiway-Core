FROM eclipse-temurin:21-jre-jammy
RUN apt-get update \
    && apt-get install --no-install-recommends --yes curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --home-dir /home/graphhopper graphhopper
WORKDIR /app
RUN mkdir graph-cache && chown graphhopper:graphhopper graph-cache
COPY --chown=graphhopper:graphhopper graphhopper-web-latest.jar ./graphhopper-web-latest.jar
COPY --chown=graphhopper:graphhopper indonesia-latest.osm.pbf ./indonesia-latest.osm.pbf
COPY --chown=graphhopper:graphhopper config-log.yml truck_small.json truck_medium.json truck_large.json ./
USER graphhopper
EXPOSE 8989
ENTRYPOINT ["java", "-Xms2g", "-Xmx4g", "-jar", "graphhopper-web-latest.jar", "server", "config-log.yml"]

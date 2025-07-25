/* eslint-disable @typescript-eslint/no-explicit-any */
import styled from 'styled-components';
import { geoWinkel3 } from 'd3-geo-projection';
import UNDPColorModule from 'undp-viz-colors';
import { zoom } from 'd3-zoom';
import { format } from 'd3-format';
import { select } from 'd3-selection';
import { scaleThreshold } from 'd3-scale';
import { useEffect, useRef, useState } from 'react';
import {
  CountryGroupDataType,
  HoverDataType,
  CountryDataType,
} from '../../Types';
import { Tooltip } from '../../Components/Tooltip';

interface Props {
  data: CountryDataType[];
  selectedOption:
    | 'No. of Projects As Provider Countries'
    | 'No. of Projects As Host Countries';
  worldShape: any;
  countryTaxonomy: CountryGroupDataType[];
  filterByHost: string[];
  filterByProvider: string[];
}

const LegendEl = styled.div`
  padding: 0.5rem 0.5rem 0 0.5rem;
  background-color: rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow);
  width: 440px;
  margin-left: 1rem;
  margin-top: -1rem;
  position: relative;
  z-index: 5;
  @media (min-width: 961px) {
    transform: translateY(-100%);
  }
`;

const G = styled.g`
  pointer-events: none;
`;

export function UnivariateMap(props: Props) {
  const {
    data,
    countryTaxonomy,
    worldShape,
    selectedOption,
    filterByHost,
    filterByProvider,
  } = props;
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    undefined,
  );
  const [hoverData, setHoverData] = useState<HoverDataType | undefined>(
    undefined,
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const svgWidth = window.innerWidth > 960 ? 1280 : 960;
  const svgHeight = window.innerWidth > 960 ? 640 : 530;
  const mapSvg = useRef<SVGSVGElement>(null);
  const mapG = useRef<SVGGElement>(null);
  const projection = geoWinkel3()
    .rotate([0, 0])
    .scale(200)
    .translate([475, 375]);
  const valueArray = [2, 5, 7, 10, 15];
  const colorArray = UNDPColorModule.sequentialColors.neutralColorsx06;
  const colorScale = scaleThreshold<number, string>()
    .domain(valueArray)
    .range(colorArray);
  useEffect(() => {
    const mapGSelect = select(mapG.current);
    const mapSvgSelect = select(mapSvg.current);
    const zoomBehavior = zoom()
      .scaleExtent([0.7, 12])
      .translateExtent([
        [-20, 0],
        [svgWidth + 20, svgHeight],
      ])
      .on('zoom', ({ transform }) => {
        setZoomLevel(transform.k);
        mapGSelect.attr('transform', transform);
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapSvgSelect.call(zoomBehavior as any);
  }, [svgHeight, svgWidth]);
  return (
    <div
      style={{
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--gray-200)',
      }}
    >
      <svg
        width='100%'
        height='100%'
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        ref={mapSvg}
      >
        <rect y='-20' width={svgWidth} height={svgHeight + 40} fill='#f7f7f7' />
        <g ref={mapG}>
          {worldShape.features.map((d: any, i: number) => {
            if (d.properties.NAME === 'Antarctica') return null;
            return (
              <g key={i} opacity={!selectedColor ? 1 : 0.2}>
                {d.geometry.type === 'MultiPolygon'
                  ? d.geometry.coordinates.map((el: any, j: any) => {
                      let masterPath = '';
                      el.forEach((geo: number[][]) => {
                        let path = ' M';
                        geo.forEach((c: number[], k: number) => {
                          const point = projection([c[0], c[1]]) as [
                            number,
                            number,
                          ];
                          if (k !== geo.length - 1)
                            path = `${path}${point[0]} ${point[1]}L`;
                          else path = `${path}${point[0]} ${point[1]}`;
                        });
                        masterPath += path;
                      });
                      return (
                        <path
                          key={j}
                          d={masterPath}
                          stroke='#999'
                          strokeWidth={0.2 / zoomLevel}
                          fill={UNDPColorModule.graphNoData}
                        />
                      );
                    })
                  : d.geometry.coordinates.map((el: any, j: number) => {
                      let path = 'M';
                      el.forEach((c: number[], k: number) => {
                        const point = projection([c[0], c[1]]) as [
                          number,
                          number,
                        ];
                        if (k !== el.length - 1)
                          path = `${path}${point[0]} ${point[1]}L`;
                        else path = `${path}${point[0]} ${point[1]}`;
                      });
                      return (
                        <path
                          key={j}
                          d={path}
                          stroke='#999'
                          strokeWidth={0.2 / zoomLevel}
                          fill={UNDPColorModule.graphNoData}
                        />
                      );
                    })}
              </g>
            );
          })}
          {data
            .filter(d => d['Alpha-3 code'] !== 'ATA')
            .map((d, i: number) => {
              const index = worldShape.features.findIndex(
                (el: any) => d['Alpha-3 code'] === el.properties.ISO3,
              );
              const indicator =
                selectedOption === 'No. of Projects As Host Countries'
                  ? 'noOfProjectAsHost'
                  : 'noOfProjectAsProvider';
              const val = d[indicator];
              const color = val ? colorScale(val) : UNDPColorModule.graphNoData;

              return (
                <g
                  key={i}
                  opacity={
                    selectedColor ? (selectedColor === color ? 1 : 0.1) : 1
                  }
                  onMouseEnter={event => {
                    setHoverData({
                      country:
                        countryTaxonomy[
                          countryTaxonomy.findIndex(
                            el => el['Alpha-3 code'] === d['Alpha-3 code'],
                          )
                        ]['Country or Area'],
                      continent:
                        countryTaxonomy[
                          countryTaxonomy.findIndex(
                            el => el['Alpha-3 code'] === d['Alpha-3 code'],
                          )
                        ]['Group 1'],
                      noOfProjectsAsHost: d.noOfProjectAsHost,
                      noOfProjectsAsProvider: d.noOfProjectAsProvider,
                      xPosition: event.clientX,
                      yPosition: event.clientY,
                    });
                  }}
                  onMouseMove={event => {
                    setHoverData({
                      country:
                        countryTaxonomy[
                          countryTaxonomy.findIndex(
                            el => el['Alpha-3 code'] === d['Alpha-3 code'],
                          )
                        ]['Country or Area'],
                      continent:
                        countryTaxonomy[
                          countryTaxonomy.findIndex(
                            el => el['Alpha-3 code'] === d['Alpha-3 code'],
                          )
                        ]['Group 1'],
                      noOfProjectsAsHost: d.noOfProjectAsHost,
                      noOfProjectsAsProvider: d.noOfProjectAsProvider,
                      xPosition: event.clientX,
                      yPosition: event.clientY,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoverData(undefined);
                  }}
                >
                  {index === -1
                    ? null
                    : worldShape.features[index].geometry.type ===
                      'MultiPolygon'
                    ? worldShape.features[index].geometry.coordinates.map(
                        (el: any, j: any) => {
                          let masterPath = '';
                          el.forEach((geo: number[][]) => {
                            let path = ' M';
                            geo.forEach((c: number[], k: number) => {
                              const point = projection([c[0], c[1]]) as [
                                number,
                                number,
                              ];
                              if (k !== geo.length - 1)
                                path = `${path}${point[0]} ${point[1]}L`;
                              else path = `${path}${point[0]} ${point[1]}`;
                            });
                            masterPath += path;
                          });
                          return (
                            <path
                              key={j}
                              d={masterPath}
                              stroke='#999'
                              strokeWidth={0.2 / zoomLevel}
                              fill={color}
                            />
                          );
                        },
                      )
                    : worldShape.features[index].geometry.coordinates.map(
                        (el: any, j: number) => {
                          let path = 'M';
                          el.forEach((c: number[], k: number) => {
                            const point = projection([c[0], c[1]]) as [
                              number,
                              number,
                            ];
                            if (k !== el.length - 1)
                              path = `${path}${point[0]} ${point[1]}L`;
                            else path = `${path}${point[0]} ${point[1]}`;
                          });
                          return (
                            <path
                              key={j}
                              d={path}
                              stroke='#999'
                              strokeWidth={0.2 / zoomLevel}
                              fill={color}
                            />
                          );
                        },
                      )}
                </g>
              );
            })}
          {hoverData
            ? worldShape.features
                .filter(
                  (d: any) =>
                    d.properties.ISO3 ===
                    countryTaxonomy[
                      countryTaxonomy.findIndex(
                        el => el['Country or Area'] === hoverData?.country,
                      )
                    ]['Alpha-3 code'],
                )
                .map((d: any, i: number) => (
                  <G opacity={!selectedColor ? 1 : 0} key={i}>
                    {d.geometry.type === 'MultiPolygon'
                      ? d.geometry.coordinates.map((el: any, j: any) => {
                          let masterPath = '';
                          el.forEach((geo: number[][]) => {
                            let path = ' M';
                            geo.forEach((c: number[], k: number) => {
                              const point = projection([c[0], c[1]]) as [
                                number,
                                number,
                              ];
                              if (k !== geo.length - 1)
                                path = `${path}${point[0]} ${point[1]}L`;
                              else path = `${path}${point[0]} ${point[1]}`;
                            });
                            masterPath += path;
                          });
                          return (
                            <path
                              key={j}
                              d={masterPath}
                              stroke='#212121'
                              opacity={1}
                              strokeWidth={1.5 / zoomLevel}
                              fillOpacity={0}
                              fill={UNDPColorModule.graphNoData}
                            />
                          );
                        })
                      : d.geometry.coordinates.map((el: any, j: number) => {
                          let path = 'M';
                          el.forEach((c: number[], k: number) => {
                            const point = projection([c[0], c[1]]) as [
                              number,
                              number,
                            ];
                            if (k !== el.length - 1)
                              path = `${path}${point[0]} ${point[1]}L`;
                            else path = `${path}${point[0]} ${point[1]}`;
                          });
                          return (
                            <path
                              key={j}
                              d={path}
                              stroke='#212121'
                              opacity={1}
                              strokeWidth={1.5 / zoomLevel}
                              fillOpacity={0}
                              fill='none'
                            />
                          );
                        })}
                  </G>
                ))
            : null}
        </g>
      </svg>
      <LegendEl>
        <h6 className='undp-typography'>{selectedOption}</h6>
        <svg width='100%' viewBox={`0 0 ${340} ${30}`}>
          <g>
            {valueArray.map((d, i) => (
              <g
                key={i}
                onMouseOver={() => {
                  setSelectedColor(colorArray[i]);
                }}
                onMouseLeave={() => {
                  setSelectedColor(undefined);
                }}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={(i * 320) / colorArray.length + 1}
                  y={1}
                  width={320 / colorArray.length - 2}
                  height={8}
                  fill={colorArray[i]}
                  stroke={
                    selectedColor === colorArray[i] ? '#212121' : colorArray[i]
                  }
                />
                <text
                  x={((i + 1) * 320) / colorArray.length}
                  y={25}
                  textAnchor='middle'
                  fontSize={12}
                  fill='#212121'
                >
                  {Math.abs(d) < 1 ? d : format('~s')(d).replace('G', 'B')}
                </text>
              </g>
            ))}
            <g>
              <rect
                onMouseOver={() => {
                  setSelectedColor(colorArray[valueArray.length]);
                }}
                onMouseLeave={() => {
                  setSelectedColor(undefined);
                }}
                x={(valueArray.length * 320) / colorArray.length + 1}
                y={1}
                width={320 / colorArray.length - 2}
                height={8}
                fill={colorArray[valueArray.length]}
                stroke={
                  selectedColor === colorArray[valueArray.length]
                    ? '#212121'
                    : colorArray[valueArray.length]
                }
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
              />
            </g>
          </g>
        </svg>
      </LegendEl>
      <div
        className='bivariate-legend-container'
        style={{
          justifyContent: 'flex-end',
          width: '100%',
          marginRight: 'var(--spacing-05)',
          marginBottom: 0,
        }}
      >
        <div
          className='bivariate-legend-el'
          style={{ alignItems: 'flex-start', marginBottom: 0, maxWidth: '50%' }}
        >
          <div className='flex-div' style={{ alignItems: 'flex-end' }}>
            <div
              style={{
                display: 'flex',
                pointerEvents: 'auto',
                padding: 'var(--spacing-01)',
                paddingRight: 'var(--spacing-05)',
                backgroundColor: 'rgba(255,255,255,0.4)',
              }}
            >
              <p
                className='undp-typography italics margin-bottom-00'
                style={{ fontSize: '0.625rem' }}
              >
                The designations employed and the presentation of material on
                this map do not imply the expression of any opinion whatsoever
                on the part of the Secretariat of the United Nations or UNDP
                concerning the legal status of any country, territory, city or
                area or its authorities, or concerning the delimitation of its
                frontiers or boundaries.
              </p>
            </div>
          </div>
        </div>
      </div>
      {hoverData ? (
        <Tooltip
          data={hoverData}
          selectedOption={selectedOption}
          filterByProvider={filterByProvider.map(
            d =>
              countryTaxonomy[
                countryTaxonomy.findIndex(el => el['Alpha-3 code'] === d)
              ]['Country or Area'],
          )}
          filterByHost={filterByHost.map(
            d =>
              countryTaxonomy[
                countryTaxonomy.findIndex(el => el['Alpha-3 code'] === d)
              ]['Country or Area'],
          )}
        />
      ) : null}
    </div>
  );
}

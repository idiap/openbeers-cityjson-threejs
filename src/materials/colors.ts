//
// SPDX-FileCopyrightText: Copyright © <2024-2025> Idiap Research Institute <contact@idiap.ch>
//
// SPDX-FileContributor: David Geissbühler <david.geissbuhler@idiap.ch>
// SPDX-FileContributor: Stelios Vitalis (from cityjson-threejs-loader)
//
// SPDX-License-Identifier: Apache-2.0
//

// ---

export const default_object_colors : {[key: string]: number} = {
	"Building": 0xd3adb2,
	"BuildingPart": 0xe6ebe5,
	"BuildingInstallation": 0xb6bba5,
	"Bridge": 0xfa9496,
	"BridgePart": 0xfa9496,
	"BridgeInstallation": 0xfa9496,
	"BridgeConstructionElement": 0xfa9496,
	"CityObjectGroup": 0xffffb3,
	"CityFurniture": 0x97585c,
	"GenericCityObject": 0x97585c,
	"LandUse": 0xdfdfdf,
	"PlantCover": 0x1aea1a,
	"Railway": 0xbab8b8,
	"Road": 0xbab8b8,
	"SolitaryVegetationObject": 0x4da559,
	"TINRelief": 0xdfdfdf,
	"TransportSquare": 0x97585c,
	"Tunnel": 0x97585c,
	"TunnelPart": 0x97585c,
	"TunnelInstallation": 0x97585c,
	"WaterBody": 0x769cf5
};

// ---

export const default_semantics_colors : {[key: string]: number} = {
	"GroundSurface": 0xe9e9e9,
	"WallSurface": 0xefe6e4,
	"RoofSurface": 0xddb6bd,
	"TrafficArea": 0xbab8b8,
	"AuxiliaryTrafficArea": 0xdddddd,
	"Window": 0x0059ff,
	"Door": 0x64cccc,
	"VegetationSurface": 0x47e647,
	"WaterSurface": 0x769cf5
};

// ---

export const default_layers_colors : {[key: string]: number} = {
	"swissalti3d_2m0": 0xffffff,
	"swissaltiregio": 0xffffff,
	"swissboundaries3d": 0xffffff,
	"swissbuildings3d": 0xffffff,
	"swissnames3d": 0xffffff,
	"swisstlm3d": 0xffffff,
	"swisstlmregio": 0xffffff,
	"land_register": 0xffffff,
	"land_register:ground_cover": 0xffffff,
	"land_register:land_plots": 0xffffff,
	"swissboundaries3d:country": 0xdbdbdb,
	"swissboundaries3d:region": 0xdbdbdb,
	"swissboundaries3d:district": 0xdbdbdb,
	"swissboundaries3d:municipality": 0xdbdbdb,
	"energy": 0xffffff,
	"energy:dist-dhn": 0xffffff,
	"energy:dist-electricity": 0xffffff,
	"energy:dist-gaz": 0xffffff,
	"energy:prod-pv": 0xffffff,
	"power_plants": 0xffffff,
	"swissbuildings3d:floor": 0xaaaaaa,
	"swissbuildings3d:wall": 0xaaaaaa,
	"swissbuildings3d:roof": 0xddb6bd,
	"swissbuildings3d:building_solid": 0xddb6bd,
	"ground": 0xeeeeee,
	"ground:other": 0xdbdbdb,
	"ground:building": 0xddb6bd,
	"ground:vegetation": 0x5fed5f,
	"ground:road": 0xbab8b8,
	"ground:water": 0x769cf5,
	"ch.bfs.building_register": 0xffffff,
	"buildings": 0xddb6bd,
	"buildings:surfaces_lod2": 0xddb6bd,
};

// ---

export const default_background_color: number = 0xd9eefc;
export const default_selection_color: number = 0xffc107;
export const default_default_color: number= 0xdddddd;

// ---

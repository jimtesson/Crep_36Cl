function [VecT,VecSF]=LSDv10(lat,lon,alt,atm,age,w,nuclide,Paleomag)

% This function calculates Lifton, Sato, and Dunai time-dependent scaling factors 
% for a given set of inputs
% syntax : LSD(lat,lon,alt,atm,age,nuclide);

% lat = sample latitude in deg N (negative values for S hemisphere)
% lon = sample longitude in deg E (negative values for W longitudes, 
%     or 0-360 degrees E) 
% alt = sample altitude in m above sea level
% atm = atmospheric model to use: 1 for U.S. Standard Atmosphere, 
%     0 for ERA-40 Reanalysis
% age = age of sample
% w = gravimetric fractional water content - 0.066 is default 
%     typically about 14% volumetric per Fred Phillips. -1 gives default
%     value
% nuclide = nuclide of interest: 26 for 26Al, 10 for 10Be, 14 for 14C,
%     3 for 3He, 0 for nucleon flux
% 
% Input values as scalars
%
% Based on code written by Greg Balco -- Berkeley
% Geochronology Center
% balcs@bgc.org
% 
% Modified by Brent Goehring and 
% Nat Lifton -- Purdue University
% nlifton@purdue.edu, bgoehrin@purdue.edu
%
% Modified for the CREp program by LCP Martin, PH Blard and J Lav? in May 2015 
%-- loops eliminated in called functions, replaced by vectors to increase
% computation speed 
% CNRS-Universit? de Lorraine 
% blard@crpg.cnrs-nancy.fr


% Copyright 2013, Berkeley Geochronology Center and
% Purdue University
% All rights reserved
% Developed in part with funding from the National Science Foundation.
%
% This program is free software; you can redistribute it and/or modify
% it under the terms of the GNU General Public License, version 3,
% as published by the Free Software Foundation (www.fsf.org).


% what version is this?
ver = '1.0';

load consts_LSD;

is14 = 0;
is10 = 0;
is26 = 0;
is3 = 0;
isflux = 0;

% Load the input data structure

sample.lat = lat;
sample.lon = lon;
sample.alt = alt;
sample.atm = atm;
sample.age = age;
sample.nuclide = nuclide;

if nuclide == 14
    is14 = 1;
elseif nuclide == 10
    is10 = 1;
elseif nuclide == 26
    is26 = 1;    
elseif nuclide == 3
    is3 = 1;  
else
    isflux = 1;
end    

if sample.atm == 1
    stdatm = 1;
    gmr = -0.03417; % Assorted constants
    dtdz = 0.0065; % Lapse rate from standard atmosphere
else
    stdatm = 0;
end
    
% Make the time vector
calFlag = 0;

% Age Relative to t0=2010
tv = [0:10:50 60:100:50060 51060:1000:2000060 logspace(log10(2001060),7,200)];

% Need solar modulation parameter
this_SPhi = zeros(size(tv)) + consts.SPhiInf; % Solar modulation potential for Sato et al. (2008)
this_SPhi(1:120) = consts.SPhi; % Solar modulation potential for Sato et al. (2008)

if w < 0
    w = 0.066; % default gravimetric water content for Sato et al. (2008)
end

% Pressure correction

if stdatm == 1
    % Calculate site pressure using the Standard Atmosphere parameters with the
    % standard atmosphere equation.
    sample.pressure = 1013.25 .* exp( (gmr./dtdz) .* ( log(288.15) - log(288.15 - (alt.*dtdz)) ) );
else    
    sample.pressure = ERA40atm(sample.lat,sample.lon,sample.alt);
end

% catch for negative longitudes before Rc interpolation
if sample.lon < 0; sample.lon = sample.lon + 360;end;

%--------- Handling of the Paleomagnetic database choice -------------------------------------------
% Make up the Rc vectors.
LSDRc = zeros(1,length(tv));

% What type of paleomagnetic data
if sum(size(Paleomag))==2;
    % Case of classical VDM data
    GeoMDBNorm(1,:)=consts.t_M;
    GeoMDBNorm(2,:)=consts.M;
    Mt0=[0;1];
    GeoMDBNorm=[Mt0 GeoMDBNorm];
else
    % Particular case of LSD framework
    Paleomag(2,:)=Paleomag(2,:)./Paleomag(2,1);
    GeoMDBNorm=Paleomag;
    GeoMDBNorm(1,:)=GeoMDBNorm(1,:).*1000; % GMDB in ka but LSD in a
    if 1.2*age<GeoMDBNorm(1,end)
        VecIndice=find(GeoMDBNorm(1,:)>(1.2*age));
        GeoMDBNorm=GeoMDBNorm(:,1:VecIndice(1));
    end
end

% Fit to Trajectory-traced GAD dipole field as f(M/M0), as long-term average.
dd = [6.89901,-103.241,522.061,-1152.15,1189.18,-448.004;];
VecM=interp1(GeoMDBNorm(1,:),GeoMDBNorm(2,:),tv);
LSDRc(1:end) = VecM.*(dd(1)*cosd(sample.lat) + ...
    dd(2)*(cosd(sample.lat)).^2 + ...
    dd(3)*(cosd(sample.lat)).^3 + ...
    dd(4)*(cosd(sample.lat)).^4 + ...
    dd(5)*(cosd(sample.lat)).^5 + ...
    dd(6)*(cosd(sample.lat)).^6);

% Modified to work with new interpolation routines in MATLAB 2012a and later. 09/12
if Paleomag==3;
    [loni,lati,tvi] = meshgrid(sample.lon,sample.lat,tv(1:76)); % To access tvi
    LSDRc(1:76) = interp3(consts.lon_Rc,consts.lat_Rc,consts.t_Rc,consts.TTRc,loni,lati,tvi);
end

% Next, chop off tv
clipindex = find(tv <= sample.age, 1, 'last' );
tv2 = tv(1:clipindex);
if tv2(end) < sample.age;
    tv2 = [tv2 sample.age];
end;
% Now shorten the Rc's commensurately 
LSDRc = interp1(tv,LSDRc,tv2);
LSDSPhi = interp1(tv,this_SPhi,tv2);

VecSF = LSDscaling(sample.pressure,LSDRc(:),LSDSPhi,w,consts,nuclide);
VecT = tv2;
end

function [ out ] = Func_Sf( Param_site,atm,w,Paleomag)
% Func_Sf: Function to calculate the scaling factors over a time vector,
% based on Marrero et al. 2016. The spacing of the time vector is variable:
% in the Holocene, it follows the spacing of the paleomagnetic data records, 
% mostly at 500 yrs. Between 12000 and 800,000 yr, the spacing is 1000 yr 
% to agree with the SINT-800 record. After 800,000 yt there is logarithmic
% spacing out to 10 million years. See the hard-copy documentation for 
% Marrero et al. 2016 for more details. 

% INPUT: 
%       scaling_model :
%           scaling_model = 'user' : user-provided scaling factors for
%                                   neutrons and muons.
%           scaling_model = 'st' : stone 2000 scheme scaling factors
%           scaling_model = 'sa' : Lifton-Sato scheme scaling factors
%           scaling_model = 'all' : computes stone 2000 and Lifton-Sato
%
%       Param_site :  site-specific parameters.
% OUTPUT:
%       out : struct. containing the scaling factors.
%

% site parameters
lat = Param_site.lat;
long = Param_site.long;
alt = Param_site.alt;
%pressure=1013.25*exp(-0.03417/0.0065*(log(288.15)-log(288.15-0.0065*Param_site.alt)));

%% Scaling factor computation

% Lal-Stone Scaling
        % CosmoAge calculation
        [SF_St,SF_St_sp,SF_St_mu] =StoneFactV2(lat,long,alt,atm);
        out.SF_St = SF_St;
        out.SF_St_sp = SF_St_sp;
        out.SF_St_sp_er = SF_St_sp .* 0.05;
        out.SF_St_mu = SF_St_mu;
        out.SF_St_mu_er = SF_St_mu .* 0.05;
        
%  Lifton-Sato
    
    % load constants
    load('pmag_consts.mat')
    consts = pmag_consts; clear pmag_consts;
    
    %% Pressure Model
    if atm == 1
        stdatm = 1;
        gmr = -0.03417; % Assorted constants
        dtdz = 0.0065; % Lapse rate from standard atmosphere
    else
        stdatm = 0;
    end
    % Pressure correction
    if stdatm == 1
        % Calculate site pressure using the Standard Atmosphere parameters with the
        % standard atmosphere equation.
        pressure = 1013.25 .* exp( (gmr./dtdz) .* ( log(288.15) - log(288.15 - (alt.*dtdz)) ) );
    else    
        pressure = ERA40atm(lat,long,alt);
    end
    
    %% paleomagnetic database
        age = 0;
    if sum(size(Paleomag))==2
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

    % catch for negative longitudes before Rc interpolation
    if long < 0; long = long + 360;end;

    %% Parameters used to compute scaling factors over time 

    % Time vector for time dependent scaling factors: Age Relative to t0=2010
    tv = [0:10:50 60:100:50060 51060:1000:2000060 logspace(log10(2001060),7,200)];

    % Need solar modulation for Lifton SF's
    this_SPhi = zeros(size(tv)) + consts.SPhiInf; % Solar modulation potential for Sato et al. (2008)
    this_SPhi(1:120) = consts.SPhi; % Solar modulation potential for Sato et al. (2008)
    
    % water content
    if w < 0
        w = 0.066; % default gravimetric water content for Sato et al. (2008)
    end
    
    % interpolate an M for tv > 7000...
    %first sort the values to be interpolated for
    [sorttv,indextv]=sort(tv(77:end));
    %use "interpolate" to interpolate for the sorted values
    temp_Munsorted = interp1(GeoMDBNorm(1,:),GeoMDBNorm(2,:),tv);
    for v=1:length(sorttv);
        temp_M(indextv(v))=temp_Munsorted(v);
    end
    
    if Paleomag==3;
    [longi,lati,tvi] = meshgrid(long,lat,tv(1:76));
    LiRc(1:76) = interp3(consts.lon_Rc,consts.lat_Rc,consts.t_Rc,consts.TTRc,longi,lati,tvi);
    end

    %   New Equation - unpublished -  Fit to Trajectory-traced GAD dipole field as f(M/M0), as long-term average. This is the one I'm using now...
    dd = [6.89901,-103.241,522.061,-1152.15,1189.18,-448.004;];

    LiRc(77:(length(tv))) = temp_M.*(dd(1)*cosd(lat) + ...
       dd(2)*(cosd(lat)).^2 + ...
       dd(3)*(cosd(lat)).^3 + ...
       dd(4)*(cosd(lat)).^4 + ...
       dd(5)*(cosd(lat)).^5 + ...
       dd(6)*(cosd(lat)).^6);

    if (min(LiRc)<0)
        %        error('LiRc contains negative rigidity cutoffs');
        LiRc(LiRc<0)=0.0;
    end
    
    % Get scaling factors
	scaling=LiftonSatoSX(pressure,LiRc,this_SPhi,0,consts);
	out.SF_Sf=scaling.sp;
	out.Rc_Sf=LiRc;
	out.SF_Sa36Ca=scaling.ClCa;
	out.SF_Sa36K=scaling.ClK;
	out.SF_Sa36Ti=scaling.ClTi;
	out.SF_Sa36Fe=scaling.ClFe;
	out.SF_Saeth=scaling.eth;
	out.SF_Sath=scaling.th;
	out.Rc_Sa=LiRc;
    out.tv = tv;
    
end


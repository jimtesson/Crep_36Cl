
function out=getcurrentsf(sf,t,scaling_model,nuclide);
% Function to get the elevation/latitude time dependent scaling factors for
% neutrons by nuclide (SelXX) and thermal (SFth) and epithermal neutrons (SFeth) 
% by interpolating the tables of time dependent scaling factors. 
% INPUT:
%       sf : structure containing the scaling factors.
%       t : time vector for which we want the scaling factors.
%       scaling_model : scaling scheme for neutrons ('st' for stone 2000,
%       'sa' for Lifton-Sato).
%       nuclide : for LSD scheme, specify the nuclide: 'cl' for chlorine.
%
% OUTPUT:
%       out: struct containing the scaling factors 
%
% version 01/08/2019 TESSON J.
% Modified after Marrero 2016, Chronus code.
%

if (t<-max(sf.tv)/1000)
  t=-max(sf.tv)/1000
  warning('extremely old time in getcurrentsf!');
end

%
% If scaling_model is not specified, error
%
if (~exist('scaling_model','var'))
	error('CRONUS:InternalError','No scaling_model supplied to getcurrentsf');
else
	scaling_model = lower(scaling_model);
end

%
% If nuclide is not specified, default to 'all'
%
if (~exist('nuclide','var'))
	nuclide = 'all'; 
else
	nuclide = lower(nuclide);
end

%
% Look for times after 2110 AD.  This is most likely an error.
% 
if (t>0.3)
  t
  warning('extremely young time in getcurrentsf!');
  t=0;
end
%
% For all times after t=0 (2010), use the 2010 scaling factors by
% forcing t=0.  We don't let this get too far out of hand- this is
% limited to 2110 (see above.)
%
if (t > 0)
  t=0.0;
end

% All of the following interpolate calls use a converted value for t
% so we do this now to cut down on math operations (this is called
% many many times)
new_t = -t*1000;

switch scaling_model
case 'st'
%
% This version for the Lal/Stone scheme.  
% No point in checking nuclide since it's the same 
% calculation regardless
%
 	out.SelSF = sf.SF_St;
	out.Sel36Ca = sf.SF_St_sp;
	out.Sel36K = sf.SF_St_sp;
	out.Sel36Ti = sf.SF_St_sp;
	out.Sel36Fe = sf.SF_St_sp;
	out.SFth = sf.SF_St_sp;
	out.SFeth = sf.SF_St_sp;
    out.SFmu = sf.SF_St_mu;
case 'sa'
%
% This version for the Sato nuclide-dependent scheme.  Implements nuclide-dependent scaling
% by incorporating cross-sections.
%
if (strcmpi(nuclide,'all'))
    
    SF = [sf.SF_Sa36Ca' sf.SF_Sa36K' sf.SF_Sa36Ti' sf.SF_Sa36Fe' sf.SF_Sath' sf.SF_Saeth' sf.SF_Sf'];
    SF_interp = interp1(sf.tv,SF,-new_t,'linear')';
    out.Sel36Ca = SF_interp(1,:);
    out.Sel36K = SF_interp(2,:);
    out.Sel36Ti = SF_interp(3,:);
    out.Sel36Fe = SF_interp(4,:);
    out.SFth = SF_interp(5,:);
    out.SFeth = SF_interp(6,:);
    out.SelSF = SF_interp(7,:);
    
elseif (strcmpi(nuclide,'cl'))

    SF = [sf.SF_Sa36Ca' sf.SF_Sa36K' sf.SF_Sa36Ti' sf.SF_Sa36Fe' sf.SF_Sath' sf.SF_Saeth' sf.SF_Sf'];
    SF_interp = interp1(sf.tv,SF,-new_t,'linear')';
    out.Sel36Ca = SF_interp(1,:);
    out.Sel36K = SF_interp(2,:);
    out.Sel36Ti = SF_interp(3,:);
    out.Sel36Fe = SF_interp(4,:);
    out.SFth = SF_interp(5,:);
    out.SFeth = SF_interp(6,:);
    out.SelSF = SF_interp(7,:);

% 	out.Sel36Ca=interpolate(sf.tv,sf.SF_Sa36Ca,-new_t);
% 	out.Sel36K=interpolate(sf.tv,sf.SF_Sa36K,-new_t);
% 	out.Sel36Ti=interpolate(sf.tv,sf.SF_Sa36Ti,-new_t);
% 	out.Sel36Fe=interpolate(sf.tv,sf.SF_Sa36Fe,-new_t);
% 	out.SFth=interpolate(sf.tv,sf.SF_Sath,-new_t);
% 	out.SFeth=interpolate(sf.tv,sf.SF_Saeth,-new_t);
%     out.SelSF=interpolate(sf.tv,sf.SF_Sf,-new_t);
    
end
end
%
%uncomment and change below if we go back to time-dependent muons
%
%SFmufast=interpolate(sf.tv,sf.SFmu_Li,-new_t);
%SFmuslow=interpolate(sf.tv,sf.SFmu_Li,-new_t);

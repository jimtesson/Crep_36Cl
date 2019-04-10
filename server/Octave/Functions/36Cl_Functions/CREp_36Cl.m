function Nf = CREp_36Cl(DATA_CREP,EL,Z)
% This function computes the theoretical 36Cl of a sample of depth profile, 
% compute the sample age and denuadation rate. User can choose between 2 
%   models: 1) the Schimmelfenning 2009 model, 2) numerical approach using 
%   the LSD model.
% INPUT : 
%       DATA_CREP : sample data matrix from the user, using the CREp format.
% 
%           1: sample name, 2: latitude (deg), 
%           3: longitude (deg), 4: altitude (masl)
%           5: shielding, 6: density (g/cm3), 
%           7: tickness (cm), 8: erosion (cm/an)
%           9: formation age (age), 10: +/- formation age (a),

%           11: 36Cl conc (at/g), 12: +/- 36Cl conc (at/g),
%           13: Cl_ppm_target, 14: +/- Cl_ppm_target
%           15: SiO2_%_target, 
%           16: Al2O3_%_target, 
%           17: Fe2O3_%_target, 18:+/- Fe2O3_%_target
%           19: MnO_%_target,	
%           20: MgO_%_target, 
%           21: CaO_%_target, 22:	+/- CaO_%_target, 
%           23: Na2O_%_target, 
%           24: K2O_%_target, 25: +/- K2O_%_target, 
%           26: TiO2_%_target, 27: +/- TiO2_%_target, 
%           28: P2O5_%_target, 
%           29: LOI_%_target, 
%           30: H2O_%_target,
%           31: CO2_%_target.
%
%           32: SiO2_%_bulk, 
%           33: Al2O3_%_bulk, 
%           34: Fe2O3_%_bulk, 
%           35: MnO_%_bulk, 
%           36: MgO_%_bulk, 
%           37: CaO_%_bulk, 
%           38: Na2O_%_bulk, 
%           39: K2O_%_bulk, 
%           40: TiO2_%_bulk, 
%           41: P2O5_%_bulk,	
%           42: H2O_%_bulk,	
%           43: CO2_%_bulk, 
%           44: S_%_bulk, 
%           45: LOI_%_bulk, 
%           46: Li_ppm_bulk,
%           47: B_ppm_bulk, 
%           48: Cl_ppm_bulk,
%           49: Cr_ppm_bulk, 
%           50: Co_ppm_bulk, 
%           51: Sm_ppm_bulk,
%           52: Gd_ppm_bulk, 
%           53: Th_ppm_bulk, 54: +/- Th_ppm_bulk, 
%           55: U_ppm_bulk, 56: +/- U_ppm_bulk
%
%       Z : vector of the samples
%       EL : User-provided scaling factors for neutrons and muons.
%

%
% version 01/08/2018, written by TESSON J.

%---------------VARIABLES INITIALIZATION-----------------------------------
%

addpath(genpath('Functions'))
addpath(genpath('Consts'))

% Variable and Data Initialization 
[Data,Param_site,Const_cosmo] = Init_var(DATA_CREP,Z,EL);


%% Scaling factors initialization
scaling = 'all';
disp(['Start Sf'])
Sf = Func_Sf(scaling,Param_site{1});
disp(['Sf done'])

%% Production rates and constants initialization
Param_cosmo = clrock(Data,Param_site{1},Const_cosmo);

disp(['Param cosmo done'])
%% Exposure age of the sample (only for uneroded surface) using the Schimmelfenning 2009 model
t = -log(1-(Data{1}.N36Cl.meas-Param_cosmo{1}.N36Cl.rad-Param_cosmo{1}.N36Cl.inh)*Const_cosmo.lambda36/Param_cosmo{1}.P_cosmo)/Const_cosmo.lambda36


%% Depth Profile
erosion = 10;
t_expo = 100000;
% DEPTH PROFILE V2 scaling model
flag.model = 'num';
flag.scaling_model = 'sa'; 
[N_depth_profile , N_depth_profile_uncert] = depth_profile_speed( Const_cosmo,Param_cosmo,Param_site,Sf,erosion,t_expo,Z,flag);
dataset1(1,:) = N_depth_profile;
dataset1(2,:) = N_depth_profile.*0.05;
dataset1(3,:) = Z;
figure(100)
plot(dataset1(1,:),-Z);hold on

% Pre-estimate age:
t_guess = -log(1-(dataset1(1,:)-Param_cosmo{1}.N36Cl.rad-Param_cosmo{1}.N36Cl.inh)*Const_cosmo.lambda36/Param_cosmo{1}.P_cosmo)/Const_cosmo.lambda36

% second estimate
     %flag.min_bounds = 0.0; % minimum bound for the search
     %flag.max_bounds = 400000; % maximum bound for the search
     flag.search = 'fminsearch'; %flag.search = 'nmsmax';
     tic
     flag.search = 'nmsmax';
     Best_age=Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset1, Z, erosion, t_guess, flag)
    toc
% DEPTH PROFILE V2 scaling model
flag.model = 'num';
flag.scaling_model = 'st'; 
%tic

[N_depth_profile , N_depth_profile_uncert] = depth_profile_speed( Const_cosmo,Param_cosmo,Param_site,Sf,erosion,t_expo,Z,flag);
dataset2(1,:) = N_depth_profile;
dataset2(2,:) =  N_depth_profile.*0.05;
dataset2(3,:) = Z;
figure(100)
plot(dataset2(1,:),-Z);hold on
        tic
     flag.search = 'nmsmax';
     Best_age=Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset2, Z, erosion, t_guess, flag)
        toc

% DEPTH PROFILE V2 scaling model
flag.model = 'exp';
flag.scaling_model = 'st'; 
[N_depth_profile , N_depth_profile_uncert] = depth_profile_speed( Const_cosmo,Param_cosmo,Param_site,Sf,erosion,t_expo,Z,flag);
dataset3(1,:) = N_depth_profile;
dataset3(2,:) = N_depth_profile.*0.05;
dataset3(3,:) = Z;
figure(100)
plot(dataset3(1,:),-Z);hold on
        tic
     flag.search = 'nmsmax';
     Best_age=Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset3, Z, erosion, t_guess, flag)
        toc
% Search the age of a sample, with fixed erosion rate.
% age bounds search
%age_bounds(1) = 0.0; % minimum bound for the search
%age_bounds(2) = 400000; % maximum bound for the search
% t_guess = -log(1-(dataset(1,:)-Param_cosmo{1}.N36Cl.rad-Param_cosmo{1}.N36Cl.inh)*Const_cosmo.lambda36/Param_cosmo{1}.P_cosmo)/Const_cosmo.lambda36
% tic
% Best_age=Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, Z, erosion, age_bounds, t_guess, flag)
% toc
%% Inversion MCMC

param_mcmc.n_it = 1000000; % number of movement of the mcmc

% search parameters for the erosion rate:
param_mcmc.search_bd(1,1) = 0; % min bound value (mm/kyr)
param_mcmc.search_bd(1,2) = 200; % max bound value (mm/kyr)
param_mcmc.search_std(1) =  20; % std on the gaussian proposal function (mm/kyr)

% search parameters for the time exposure:
param_mcmc.search_bd(2,1) = 0; % min bound value (yr)
param_mcmc.search_bd(2,2) = 200000; % max bound value (yr)
param_mcmc.search_std(2) =  10000; % std on the gaussian proposal function (yr)

flag.model = 'exp';
flag.scaling_model = 'st';
%tic
%out=inv_MCMC(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, Z, param_mcmc, flag);
%toc

flag.model = 'num';
flag.scaling_model = 'sa';
%tic
%out=inv_MCMC(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, Z, param_mcmc, flag);
%toc

function [ ] = GetAgesf( name )
% Function of the crep program that calculates exposure ages

% Load packages
%pkg load parallel

% Open paths and load data
addpath Functions
addpath Constants
addpath jsonlab
load('Constants/GMDB.mat');
load('Constants/OtherCst.mat');
isOctave = exist('OCTAVE_VERSION', 'builtin') ~= 0;
if isOctave
    pkg load parallel
end
%name=strrep(name,"\\","/"); %OCTAVE !!!!!
name=strrep(name,'\\','/'); %MATLAB !!!!!
% Retreive json file
%Data=loadjson(name);
% test the structure
%if(isfield(Data,'Name')==0); Data = Data{1,1}; end;
load Data_36;
%load data_fault_1s;
% Load the parameters
Nucl=Data.Nucl;
Scheme=Data.Scheme;
Atm=Data.Atm;
if Atm==0;
    load ERA40
else
    meanP=[];
    meanT=[];
    ERA40lat=[];
    ERA40lon=[];
end
if length(Data.GMDB)==1;
    NumGMDB=Data.GMDB;
    if NumGMDB==1;
        SelGMDB=GMDB.Musch;
    elseif NumGMDB==2;
        SelGMDB=GMDB.GLOPIS;
    else
        SelGMDB=GMDB.LSD;
    end
else
    NumGMDB=4;
    SelGMDB=Data.GMDB;
end
% mu=OtherCst.Dens/OtherCst.Attlgth; % Mu becomes a vector with the user
% input
Attlg=OtherCst.Attlgth;
tBe=OtherCst.tBe;
Lambda10Be=log(2)/tBe;
SelPR=Data.PR;

% Set the waitbar
% h = waitbar(0,'Calculating');

% Get user data in right form
VecName=Data.Samples';
VecLat=Data.Lat';
[NbSpl,~]=size(VecLat);
VecLon=Data.Lon';
VecAlt=Data.Alt';
VecConc=Data.NuclCon';
VecErrConc=Data.NuclErr';
VecThick=Data.Thick';
VecShield=Data.Shield';
VecErosion=Data.Eros';
VecDens=Data.Dens';
VecMu=VecDens./Attlg;

% Formatting Outputs
ExitMat=zeros(NbSpl,4);
CellPDF=cell(1,2*NbSpl);
ErrCol=zeros(NbSpl,1);
StatCell=cell(NbSpl,1);


% waitbar(1/(NbSpl+3))

%% 36 Cl Stuff
% Get 36Cl parameters 
if Nucl==36
    addpath(genpath('Functions/36Cl_Functions'));
    
    % to be given by the user: !!!!
        % Constants
        Data.lambda36 = 2.303e-6 ;
        Data.lambda36_uncert = Data.lambda36 .* 0.0066;

        % Attenuation length
        Data.Lambda_f_e = 160; % effective fast neutron attenuation coefficient (g.cm-2)
        Data.Lambda_mu = 1510 ; % slow muon attenuation length (g.cm-2)
        Data.Psi_mu_0 = 190 ; % slow negative muon stopping rate at land surface (muon/g/an), Heisinger et al. (2002)

        % Unscaled sample specific 36Cl production rate by spallation of target elements
        Data.Psi_Cl36_Ca_0 = 42.2 ;% spallation production rate for Ca, SLHL (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_K_0 = 148.1 ;% Spallation production rate at surface of 39K (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_Ti_0 = 13 ; % Spallation production rate at surface of Ti (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_Fe_0 = 1.9 ; % Spallation production rate at surface of Fe (at of Cl36 /g of Ca per yr)
        %uncertainties
        Data.Psi_Cl36_Ca_0_uncert = 4.8 ;% spallation production rate for Ca, SLHL (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_K_0_uncert = 7.8 ;% Spallation production rate at surface of 39K (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_Ti_0_uncert = 3 ; % Spallation production rate at surface of Ti (at of Cl36 /g of Ca per yr)
        Data.Psi_Cl36_Fe_0_uncert = 0.2 ; % Spallation production rate at surface of Fe (at of Cl36 /g of Ca per yr)

    
    % Variable and Data Initialization 
    [Data_formatted,Param_site,Const_cosmo] = Init_var(Data);

    % Scaling factors initialization
    %w = 0.2; % water content for Sato & Niita (2006)
    w = -1; % water content =  default value
    
    NumGMDB = 3; % 1: Mush; 2: GLOPIS; 3: LSD
    if NumGMDB==3
        Sf = Func_Sf(Param_site{1},Atm,w,NumGMDB);
    else
        Sf = Func_Sf(Param_site{1},Atm,w,SelGMDB);
    end
    % Correction factors
    Sf.S_T = Data.Shield(1); % correction factor for shielding of a sample of arbitrary orientation by surrounding topography
    Sf.S_T_er = 0.01*Data.Shield(1); % uncertainties
    Sf.S_snow = 1; % correction factor for snow shielding for spallogenic production
    Sf.S_snow_er = 0.01; % uncertainties
    Sf.S_shape = 1; % correction factor for geometry effects on spallogenic production
    Sf.S_shape_er = 0.03; % uncertainties
    
    % Production rates and constants initialization
    Param_cosmo = clrock(Data_formatted,Param_site,Const_cosmo,Sf);
    
    %% Lets calculate ages
    Scheme=2;
    Muon_model = 2;
    Scaling_model = 1;
    

    if(Scheme==1 && Data.Eros == 0 && NbSpl == 1)
        %% Exposure age of the sample (only for uneroded surface) using the Schimmelfenning 2009 model
        t = -log(1-(Data.NuclCon(1)-Param_cosmo{1}.N36Cl.rad-Param_cosmo{1}.N36Cl.inh)*Const_cosmo.lambda36/Param_cosmo{1}.P_cosmo)/Const_cosmo.lambda36
    end
    if(Scheme~=1 || Data.Eros ~= 0) % case 
        
        % Create de dataset
        dataset(1,:) = Data.NuclCon(:);
        dataset(2,:) = Data.NuclErr(:);
        dataset(3,:) = Data.Z(:);
        
        % Fix erosion rate
        erosion = Data.Eros;

        % Search parameters
        flag.min_bounds = 0.0; % minimum bound for the search
        flag.max_bounds = 400000; % maximum bound for the search
        %flag.search = 'fminsearch'; %
        flag.search = 'nmsmax';
                 
        % First guess considering the sample belongs to a surface without erosion.
        t_guess = -log(1-(Data.NuclCon(1)-Param_cosmo{1}.N36Cl.rad-Param_cosmo{1}.N36Cl.inh)*Const_cosmo.lambda36/Param_cosmo{1}.P_cosmo)/Const_cosmo.lambda36
        %t_guess = 10000;randi([flag.min_bounds flag.max_bounds],1,1);
        
        % Model used for the modeling of 36Cl concentrations
            if(Muon_model == 1)
                flag.model = 'exp';  % Muon attenuation length approximated by exponential (Schimmelfenning 2009).  
                flag.scaling_model = 'st'; % Scaling factors following Lal Stone 2000 scheme.
            else
                flag.model = 'num'; % Muon attenuation length calculated following Heisinger (2002a,b) and Balco et al. (2008)
            end
            
            if(Scaling_model == 1)
                flag.scaling_model = 'st'; % LAL-STONE scheme
            else
                flag.scaling_model = 'sa'; % LSD scheme  
            end
            
            n_trial = 200;
            % preparing dataset integrating data uncertainty
            for i=1:n_trial
                for j=1:length(NbSpl)                    
                    dataset(1,j) = Data.NuclCon(j) + Data.NuclErr(j)*randn(1);
                end
                d{i} = dataset;
            end
            % anonymous function
            func = @(i) Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, d{i}, erosion, t_guess, flag);

            age = zeros(1,n_trial);
            
            resolution = 'serial'
            % serial resolution
            if(strcmp(resolution,'serial')==1)
                for i=1:n_trial
                    %Best_age = Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, erosion, t_guess, flag);
                    age(i) = func(i);
                    t_guess = age(i); % starting age for the next search
                end
            elseif(strcmp(resolution,'parallel')==1)
            % parallel resolution
            age = [];           
           if isOctave
               %OCTAVE
                numCores = nproc();
                [age] = pararrayfun (numCores, func, [1:1:n_trial]);
           else
                %Matlab
                parfor i=1:n_trial
                    age(i) =feval(func,i);
                end    
           end
            end
           
           Mean_age = mean(age)
           Std_age = std(age)
           
           % best age
           dataset(1,:) = Data.NuclCon(:);
           dataset(2,:) = Data.NuclErr(:);
           dataset(3,:) = Data.Z(:);
           Best_age = Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, erosion, t_guess, flag);
           
           % error propagation
           
            % 2. Assume there is some value of P_effective that satisfies the simple exposure age equation. N = (P_effective/lambda)*(1-exp(-lambda*t))
            
                P_effective = dataset(1,:).*Const_cosmo.lambda36./(1-exp(-Const_cosmo.lambda36.*Best_age))
                
            % 3. Estimate the total uncertainty on P_effective by adding up uncertainties on the individual production rates from K, Ca, Cl, and then scaling to whatever the value of P_effective is. Each one of those includes both an uncertainty in the element concentration and an uncertainty in the reference production rate. 
                           % get current scaling factors.
                    t_vector = [0:100:Best_age];
                    currentsf=getcurrentsf(Sf,t_vector./1000,flag.scaling_model,'cl');
                    Sf.currentsf = currentsf;
                P36_tot = prodz36_speed(Const_cosmo,Param_cosmo{1},Sf,Data.Z(1).*Param_site{1}.rho_rock)
                P_sc_fact = P_effective./P36_tot;         
                    
                    % Spallation uncertainties

                        %Psi_Cl36_K_0_uncert = 7.8 ;% Spallation production rate at surface of 39K (at of Cl36 /g of Ca per yr)
                        %Psi_Cl36_Ti_0_uncert = 3 ; % Spallation production rate at surface of Ti (at of Cl36 /g of Ca per yr)
                        %Psi_Cl36_Fe_0_uncert = 0.2 ; % Spallation production rate at surface of Fe (at of Cl36 /g of Ca per yr)
                    Const_cosmo_uncert = Const_cosmo;
                    Const_cosmo_uncert.Psi_Cl36_Ca_0 = Const_cosmo.Psi_Cl36_Ca_0 + Const_cosmo.Psi_Cl36_Ca_0_uncert;
                    P36_uncert = prodz36_speed(Const_cosmo_uncert,Param_cosmo{1},Sf,Data.Z(1).*Param_site{1}.rho_rock)
                    D_P36_effective = (P36_uncert-P36_tot) .* P_sc_fact
                    
            % 4. Solve for t to get t = (-1/lambda)*ln(1 - N*lambda/P_effective), and propagate the uncertainty on N (Cl-36 measurement uncertainty) and P_effective (from above) using the normal linear error propagation formula.           
           
           
%            % simple propagation
%                 % best
                 dataset(1,:) = Data.NuclCon(:);
%                 dataset(2,:) = Data.NuclErr(:);
%                 dataset(3,:) = Data.Z(:);
%             Best_age = Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, erosion, t_guess, flag)
%                 %down
%             dataset(1,:) = Data.NuclCon(:)-Data.NuclErr(:);
%             Down_age = Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, erosion, t_guess, flag)
%             
%                 %up
%             dataset(1,:) = Data.NuclCon(:)+Data.NuclErr(:);
%             Up_age = Find_age(Const_cosmo, Param_cosmo, Param_site, Sf, dataset, erosion, t_guess, flag)             
               
else

%% Calculating
for i=1:NbSpl;
    % waitbar((i+1)/(NbSpl+3))
    ErrPRflag=0;
    % Preliminary corrections
    ThickCorr=(Attlg/(VecThick(i)*VecDens(i)))*(1-exp(-1*(VecThick(i)*VecDens(i))/Attlg));
    CorrConc=VecConc(i)/(ThickCorr*VecShield(i));
    
    if Scheme==1; % Lal-Stone Scaling
        
        % CosmoAge calculation
        StoneFactor=StoneFactV2(VecLat(i),VecLon(i),VecAlt(i),Atm);
        if Nucl==3;
            if VecErosion(i)==0;
                CosmoAge=CorrConc/(SelPR(1)*1000*StoneFactor);
            else
                CosmoAge=(-1/(VecMu(i)*VecErosion(i)))*log(1-(VecMu(i)*VecErosion(i)*CorrConc/(SelPR(1)*StoneFactor)))/1000;
                if isreal(CosmoAge)==0;
                    ErrPRflag=1;
                    CosmoAge=-100;
                end
            end
        elseif Nucl==10;
            CosmoAge=(-1/(Lambda10Be+VecMu(i)*VecErosion(i)))*log(1-((Lambda10Be+VecMu(i)*VecErosion(i))*CorrConc/(SelPR(1)*StoneFactor)))/1000;
            if isreal(CosmoAge)==0;
                ErrPRflag=1;
                CosmoAge=-100;
            end
        end
        ErrCosmo=CosmoAge*VecErrConc(i)/VecConc(i);
        
        % Time-dependent integration-correction
        [Age,Err,Err2,X,Y]=AgeCosmoAgeReelV22(CosmoAge,ErrCosmo,(SelPR(2)/SelPR(1)),VecLat(i),VecLon(i),VecAlt(i),SelGMDB,Atm,ERA40lat,ERA40lon,meanP,meanT);
        
    else % LSD Scaling
        
        if NumGMDB==3;
            % CosmoAge calculation
            [~,SF]=LSDv9(VecLat(i),VecLon(i),VecAlt(i),Atm,0,-1,Nucl,NumGMDB);
            if Nucl==3;
                if VecErosion(i)==0;
                    CosmoAge=CorrConc/(SelPR(1)*1000*SF);
                else
                    CosmoAge=(-1/(VecMu(i)*VecErosion(i)))*log(1-(VecMu(i)*VecErosion(i)*CorrConc/(SelPR(1)*SF)))/1000;
                    if isreal(CosmoAge)==0;
                        ErrPRflag=1;
                        CosmoAge=-100;
                    end
                end
            else
                CosmoAge=(-1/(Lambda10Be+VecMu(i)*VecErosion(i)))*log(1-((Lambda10Be+VecMu(i)*VecErosion(i))*CorrConc/(SelPR(1)*SF)))/1000;
                if isreal(CosmoAge)==0;
                    ErrPRflag=1;
                    CosmoAge=-100;
                end
            end
            ErrCosmo=CosmoAge*VecErrConc(i)/VecConc(i);
            % Time corrected age calculation
            [Age,Err,Err2,X,Y] = AgeCosmoAgeReelLSD(CosmoAge,ErrCosmo,(SelPR(2)/SelPR(1)),VecLat(i),VecLon(i),VecAlt(i),NumGMDB,Atm,Nucl);
        else
            % CosmoAge calculation
            [~,SF]=LSDv9(VecLat(i),VecLon(i),VecAlt(i),Atm,0,-1,Nucl,SelGMDB);
            if Nucl==3;
                if VecErosion(i)==0;
                    CosmoAge=CorrConc/(SelPR(1)*1000*SF);
                else
                    CosmoAge=(-1/(VecMu(i)*VecErosion(i)))*log(1-(VecMu(i)*VecErosion(i)*CorrConc/(SelPR(1)*SF)))/1000;
                    if isreal(CosmoAge)==0;
                        ErrPRflag=1;
                        CosmoAge=-100;
                    end
                end
            else
                CosmoAge=(-1/(Lambda10Be+VecMu(i)*VecErosion(i)))*log(1-((Lambda10Be+VecMu(i)*VecErosion(i))*CorrConc/(SelPR(1)*SF)))/1000;
                if isreal(CosmoAge)==0;
                    ErrPRflag=1;
                    CosmoAge=-100;
                end
            end
            ErrCosmo=CosmoAge*VecErrConc(i)/VecConc(i);
            % Time corrected age calculation
            [Age,Err,Err2,X,Y] = AgeCosmoAgeReelLSD(CosmoAge,ErrCosmo,(SelPR(2)/SelPR(1)),VecLat(i),VecLon(i),VecAlt(i),SelGMDB,Atm,Nucl);
        end
    end
    
    ExitMat(i,2)=Age;
    ExitMat(i,3)=Err;
    ExitMat(i,4)=Err2;
    CellPDF{2*i-1}=X;
    CellPDF{2*i}=Y;
    
    % Look if there is a problem with the length of the database
    if isempty(X)==1;
        ErrCol(i)=1;
        if ErrPRflag==1;
            Mess=sprintf('Production rate too low');
        elseif isnan(Age)==1;
            Mess=sprintf('Sample too old for the Geomagnetic database');
            %         elseif Age<2; Chope if to young ?
            %             Mess=sprintf('Sample too young to provide probability density distribution');
        else
            Mess=sprintf('Relative error bar too large to provide probability density function (excursion in negative ages or ages older than the Geomagnetic database)');
        end
    else
        Mess=sprintf('Ok');
    end
    StatCell{i}=Mess;
    
    % Store the time correctd scaling factor
    if Nucl==3;
        SFtc=CorrConc/(SelPR(1)*Age*1000);
    else
        SFtc=CorrConc*Lambda10Be/(SelPR(1)*(1-exp(-Lambda10Be*Age*1000)));
    end
    ExitMat(i,1)=SFtc;
end

MatPDF=CreeMatCP4(CellPDF,0.01);
ColSum=sum(MatPDF(:,2:end),2);
ToExit= ColSum==0;
MatPDF(ToExit,:)=[];
% waitbar((NbSpl+2)/(NbSpl+3))

% Fill PDFtable
VecName2=cell(1,NbSpl);
ifill=1;
for i=1:NbSpl;
    if ErrCol(i)==0;
        VecName2{ifill}=VecName{i};
        ifill=ifill+1;
    end
end
VecName2(ifill:end)=[];

% Density functions to be displayed
PDFdisp=cell(1,(ifill-1));
nbsigdisp=6;
nbptdisp=500;

if ifill>=2;
    for i=1:ifill-1;
        [~,~,Mediane,Err1SigInf,Err1SigSup,~,~]=ParamDistribV11(CellPDF{2*i-1},CellPDF{2*i});
        Binf=max(0,max((Mediane-nbsigdisp*Err1SigInf),CellPDF{2*i-1}(1)));
        Bsup=min(Mediane+nbsigdisp*Err1SigSup,CellPDF{2*i-1}(end));
        ti=linspace(Binf,Bsup,nbptdisp);
        pdfi=interp1(CellPDF{2*i-1},CellPDF{2*i},ti);
        PDFdisp{i}=[ti' pdfi'];
    end
else
    PDFdisp=[];
end

% Prepare Output
DataOut.Samples=Data.Samples;
DataOut.ScalFact=ExitMat(:,1)';
DataOut.Ages=ExitMat(:,2)';
DataOut.AgesErr=ExitMat(:,3)';
DataOut.AgesErr2=ExitMat(:,4)';
DataOut.Status=StatCell';
DataOut.TimeV=MatPDF(:,1)';
DataOut.SamplePDF=VecName2;
DataOut.PDF=MatPDF(:,2:end)';
DataOut.PDFdisp=PDFdisp;

% Write json
DataOut=savejson(name,DataOut);
NameOut=strcat(name(1:end-2),'out');
fileID=fopen(NameOut,'w');
fprintf(fileID,'%s',DataOut);
fclose(fileID);
toc
% Closing
waitbar(1/1)
% close(h)
end

end

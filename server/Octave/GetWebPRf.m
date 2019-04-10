function [ ] = GetWebPRf( name )
% Calculate a production rate from the web values
%name='data/pr/localities/2-10LSDERALin'
% Open paths and load data
addpath Functions
addpath Constants
addpath jsonlab
load GMDB
load OtherCst

% Retreive json file
Data=loadjson(name);

% Load the parameters
Nucl=Data.Nucl;
Scheme=Data.Scheme;
Atm=Data.Atm;

if Atm==0;
    % ERA 40 atmosphere
    load ERA40
else
    % Standard atmosphere
    meanP=[];
    meanT=[];
    ERA40lat=[];
    ERA40lon=[];

end

if length(Data.GMDB)==1;
    % Case of GMDB already loaded in CREp
    NumGMDB=Data.GMDB;
    if NumGMDB==1;
        SelGMDB=GMDB.Musch;
       %Muscheler database
    elseif NumGMDB==2;
        SelGMDB=GMDB.GLOPIS;
       %Lifton 2016 database
    else
       %case 3: Lifton 2014 LSD framework
        SelGMDB=GMDB.LSD;
    end
else
    % Case of user's own database input
    NumGMDB=4;
    SelGMDB=Data.GMDB;
end
mu=mean(Data.Dens)/OtherCst.Attlgth;
tBe=OtherCst.tBe;
Lambda10Be=log(2)/tBe;

% Normalise samples to creat local PR
MatPR=[Data.Lat' Data.Lon' Data.Alt' Data.Thick' Data.Shield' Data.Dens' Data.Eros' Data.NuclCon' Data.NuclErr' ];
NuclCon=StdNorm(MatPR(:,8),Data.NuclNorm,Data.Nucl);
MatPR(:,8)=NuclCon;
NuclErr=StdNorm(MatPR(:,9),Data.NuclNorm,Data.Nucl);
MatPR(:,9)=NuclErr;
Age=Data.Age;

if Scheme==1;
NormalisedPR = NormalisationWeb(Scheme,Nucl,Age,Atm,MatPR,SelGMDB);
else
    if NumGMDB == 3;
        % Particular case of LSD 2014 framework
        NormalisedPR=NormalisationWeb(Scheme,Nucl,Age,Atm,MatPR,NumGMDB);
    else
        NormalisedPR=NormalisationWeb(Scheme,Nucl,Age,Atm,MatPR,SelGMDB);
    end;
end
    
% Load the Calibration Values
LocalAgeV=NormalisedPR(1);
LocalAgeE=NormalisedPR(2);
LocalConcV=NormalisedPR(3);
LocalConcE=NormalisedPR(4);
LocalLatV=NormalisedPR(5);
LocalLonV=NormalisedPR(6);
LocalAltV=NormalisedPR(7);
LocalErV=NormalisedPR(8);


% Calculate Scaling Factor
if Scheme==1;
    SF=StoneFactCT(LocalAgeV/1000,LocalLatV,LocalLonV,LocalAltV,SelGMDB,Atm,ERA40lat,ERA40lon,meanP,meanT); % Except for this function in kyr
else
    if NumGMDB==3;
        % Particular case of LSD 2014 framework
        [VecT,VecSF]=LSDv9(LocalLatV,LocalLonV,LocalAltV,Atm,LocalAgeV,-1,Nucl,NumGMDB);
    else
        [VecT,VecSF]=LSDv9(LocalLatV,LocalLonV,LocalAltV,Atm,LocalAgeV,-1,Nucl,SelGMDB);
    end
    SF= LSDtimeInteg(Nucl,VecT,VecSF);
end


% Calculate SLHL Production rate
if isnan(SF)==1;
    SLHLPR=NaN;
    SLHLPRErr=NaN;
else
    RErr=sqrt((LocalConcE/LocalConcV)^2+(LocalAgeE/LocalAgeV)^2);
    if Nucl==3;
        if LocalErV==0;
            LocalPR=LocalConcV/(LocalAgeV);
        else
            LocalPR=(LocalConcV*mu*LocalErV)/(1-exp(-mu*LocalErV*LocalAgeV));
        end
    elseif Nucl==10;
        LocalPR=((Lambda10Be+mu*LocalErV)*LocalConcV)/((1-exp(-(Lambda10Be+mu*LocalErV)*LocalAgeV)));
        if length(Data.Notes)>1;
            if Data.Notes(1)~=-9999 % Special case of cross calibrations
                Ratio=Data.Notes(2);
                ErrRatio=Data.Notes(3);
                LocalPR=LocalPR/Ratio;
                RErr=sqrt(RErr^2+(ErrRatio/Ratio)^2);
            end
        end
    end
    LocalErr=LocalPR*RErr;
    SLHLPR=LocalPR/SF;
    SLHLPRErr=SLHLPR*RErr;
end

% Prepare output
DataOut.LocalPR=[LocalPR LocalErr]
DataOut.SLHLPR=[SLHLPR SLHLPRErr]
DataOut.ScalFact=SF;

% Write json
DataOut=savejson(name,DataOut);
NameOut=strcat(name(1:end-2),'out');
fileID=fopen(NameOut,'w');
fprintf(fileID,'%s',DataOut);
fclose(fileID);

% Closing
% waitbar(3/steps)
% close(h)
end

